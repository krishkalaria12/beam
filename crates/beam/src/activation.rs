//! Single-instance activation: the first beam process owns a local socket;
//! later invocations forward their arguments to it and exit.
//!
//! This replaces `tauri-plugin-single-instance` by extending the same idea
//! the CLI bridge already uses (plan §03): one activation surface carrying
//! `--toggle`, `--run-command` and deep-link arguments.
//!
//! Protocol: newline-delimited JSON — `{"args": ["--toggle"]}` — one request
//! per connection, no response payload required (the connection closing is
//! the acknowledgement).
//!
//! - Linux/macOS: Unix domain socket under the runtime/temp directory.
//! - Windows: named pipe `\\.\pipe\io.beam.launcher.activation` (lane A5
//!   completes the pipe server; until then Windows runs single-instance only
//!   within this skeleton's lifetime).

use serde::{Deserialize, Serialize};

/// Event name kept for ledger greppability: activation args also surface on
/// the bus when the CLI bridge lands (lane A5).
#[allow(dead_code)]
pub const ACTIVATION_ARGS_EVENT: &str = "beam-activation-args";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivationRequest {
    pub args: Vec<String>,
}

impl ActivationRequest {
    pub fn from_args(args: &[String]) -> Self {
        Self {
            args: args.to_vec(),
        }
    }
}

/// The socket path for this user. `$XDG_RUNTIME_DIR` is preferred where it
/// exists; the temp dir is the portable fallback.
pub fn socket_path() -> std::path::PathBuf {
    let file_name = "io.beam.launcher.sock";
    if let Some(runtime_dir) = std::env::var_os("XDG_RUNTIME_DIR").filter(|d| !d.is_empty()) {
        return std::path::PathBuf::from(runtime_dir).join(file_name);
    }
    let uid = std::env::var("UID").unwrap_or_else(|_| "shared".to_string());
    std::env::temp_dir().join(format!("beam-{uid}-{file_name}"))
}

#[cfg(unix)]
mod unix_impl {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::net::UnixStream;

    /// Forwards the request to a running instance. Returns `Ok(true)` when a
    /// running instance accepted it; the caller should exit. `Ok(false)` means
    /// nobody answered — become the first instance.
    pub fn try_forward(request: &ActivationRequest) -> std::io::Result<bool> {
        let path = socket_path();
        let Ok(mut stream) = UnixStream::connect(&path) else {
            return Ok(false);
        };

        let payload = serde_json::to_string(request)
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?;
        stream.write_all(payload.as_bytes())?;
        stream.write_all(b"\n")?;
        stream.flush()?;

        // The peer closes on receipt; read to EOF so delivery is confirmed.
        let mut reader = BufReader::new(stream);
        let _ignored = reader.fill_buf()?;
        Ok(true)
    }

    /// Serves activation requests forever on a background thread. Stale
    /// sockets from crashed instances are replaced before binding.
    pub fn serve(sender: async_channel::Sender<ActivationRequest>) -> std::io::Result<()> {
        use std::os::unix::fs::FileTypeExt;
        use std::os::unix::net::UnixListener;

        let path = socket_path();
        if let Ok(metadata) = std::fs::metadata(&path) {
            if metadata.file_type().is_socket() {
                let _ = std::fs::remove_file(&path);
            } else {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::AlreadyExists,
                    format!("activation path {} is not a socket", path.display()),
                ));
            }
        }
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let listener = UnixListener::bind(&path)?;

        std::thread::Builder::new()
            .name("beam-activation".into())
            .spawn(move || loop {
                match listener.accept() {
                    Ok((stream, _addr)) => {
                        let mut reader = BufReader::new(stream);
                        let mut line = String::new();
                        if reader.read_line(&mut line).is_err() || line.trim().is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<ActivationRequest>(line.trim()) {
                            Ok(request) => {
                                if sender.send_blocking(request).is_err() {
                                    break;
                                }
                            }
                            Err(error) => {
                                log::warn!("ignoring malformed activation request: {error}");
                            }
                        }
                    }
                    Err(error) => log::warn!("activation accept failed: {error}"),
                }
            })?;

        Ok(())
    }
}

#[cfg(not(unix))]
mod windows_impl {
    use super::*;

    /// Named-pipe forwarding lands with lane A5 (plan §03). Until then every
    /// invocation becomes its own instance.
    pub fn try_forward(_request: &ActivationRequest) -> std::io::Result<bool> {
        log::warn!("single-instance activation is not implemented on windows yet (lane A5)");
        Ok(false)
    }

    pub fn serve(_sender: async_channel::Sender<ActivationRequest>) -> std::io::Result<()> {
        log::warn!("activation socket server is not implemented on windows yet (lane A5)");
        Ok(())
    }
}

#[cfg(unix)]
pub use unix_impl::{serve, try_forward};
#[cfg(not(unix))]
pub use windows_impl::{serve, try_forward};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requests_round_trip_through_serde() {
        let request = ActivationRequest::from_args(&["--toggle".into(), "--run-command=x".into()]);
        let json = serde_json::to_string(&request).unwrap();
        let parsed: ActivationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.args, vec!["--toggle".to_string(), "--run-command=x".to_string()]);
    }

    #[test]
    fn forwarding_to_a_dead_socket_reports_no_instance() {
        // A path that cannot exist as a live socket.
        std::env::set_var("XDG_RUNTIME_DIR", "/nonexistent-beam-test");
        assert_eq!(try_forward(&ActivationRequest::from_args(&["--toggle".into()])).unwrap(), false);
        std::env::remove_var("XDG_RUNTIME_DIR");
    }
}
