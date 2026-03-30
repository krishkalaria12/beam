use std::collections::HashMap;
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStderr, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{mpsc, Arc};
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use flate2::read::ZlibDecoder;
use nanoid::nanoid;
use parking_lot::Mutex;
use prost::Message;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::extensions::runtime::proto::ManagerRequest;

const EXTENSION_RUNTIME_MESSAGE_EVENT: &str = "extension-runtime-message";
const EXTENSION_RUNTIME_STDERR_EVENT: &str = "extension-runtime-stderr";
const EXTENSION_RUNTIME_EXIT_EVENT: &str = "extension-runtime-exit";
const BRIDGE_MANAGER_REQUEST_KIND: &str = "manager-request";
const BRIDGE_MANAGER_RESPONSE_KIND: &str = "manager-response";
const DEFAULT_RUNTIME_ID: &str = "foreground";
const MANAGER_REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

type PendingSender = mpsc::SyncSender<Result<Vec<u8>, String>>;

fn find_repo_root(start: &Path) -> Option<PathBuf> {
    start.ancestors().find_map(|candidate| {
        let has_root_files =
            candidate.join("turbo.json").is_file() && candidate.join("package.json").is_file();
        has_root_files.then(|| candidate.to_path_buf())
    })
}

struct ManagedRuntime {
    child: Child,
    stdin: Arc<Mutex<BufWriter<ChildStdin>>>,
}

struct ExtensionRuntimeLauncher {
    program: PathBuf,
    args: Vec<String>,
}

#[derive(Default)]
pub struct ExtensionRuntimeBridgeState {
    runtimes: Arc<Mutex<HashMap<String, ManagedRuntime>>>,
    pending_manager_requests: Arc<Mutex<HashMap<String, HashMap<String, PendingSender>>>>,
}

fn write_json_line(stdin: &Arc<Mutex<BufWriter<ChildStdin>>>, value: &Value) -> Result<(), String> {
    let mut writer = stdin.lock();
    serde_json::to_writer(&mut *writer, value).map_err(|error| error.to_string())?;
    writer.write_all(b"\n").map_err(|error| error.to_string())?;
    writer.flush().map_err(|error| error.to_string())
}

fn resolve_extension_manager_entry(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidate_dirs = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidate_dirs.push(resource_dir.join("binaries"));
        candidate_dirs.push(resource_dir.join("dist"));
        candidate_dirs.push(resource_dir);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    candidate_dirs.push(manifest_dir.join("binaries"));
    if let Some(repo_root) = find_repo_root(&manifest_dir) {
        candidate_dirs.push(
            repo_root
                .join("packages")
                .join("extension-manager")
                .join("dist"),
        );
        candidate_dirs.push(
            repo_root
                .join("apps")
                .join("desktop")
                .join("src-tauri")
                .join("binaries"),
        );
    }

    for directory in candidate_dirs {
        if let Some(path) = find_extension_manager_entry_in_dir(&directory) {
            return Ok(path);
        }
    }

    Err("failed to locate an extension-manager entry for the extension runtime".to_string())
}

fn find_extension_manager_entry_in_dir(directory: &Path) -> Option<PathBuf> {
    let copied_entry = directory.join("extension-manager.cjs");
    if copied_entry.is_file() {
        return Some(copied_entry);
    }

    let dist_entry = directory.join("index.cjs");
    if dist_entry.is_file() {
        return Some(dist_entry);
    }

    let legacy_copied_entry = directory.join("extension-manager.js");
    if legacy_copied_entry.is_file() {
        return Some(legacy_copied_entry);
    }

    let legacy_dist_entry = directory.join("index.js");
    if legacy_dist_entry.is_file() {
        return Some(legacy_dist_entry);
    }

    None
}

fn build_extension_manager_args(app: &AppHandle) -> Result<Vec<String>, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?;

    Ok(vec![
        format!("--data-dir={}", data_dir.display()),
        format!("--cache-dir={}", cache_dir.display()),
    ])
}

fn resolve_extension_runtime_launcher(app: &AppHandle) -> Result<ExtensionRuntimeLauncher, String> {
    let args = build_extension_manager_args(app)?;
    let entry = resolve_extension_manager_entry(app)?;
    let mut node_args = Vec::with_capacity(args.len() + 1);
    node_args.push(entry.display().to_string());
    node_args.extend(args);

    Ok(ExtensionRuntimeLauncher {
        program: PathBuf::from("node"),
        args: node_args,
    })
}

fn maybe_inflate(payload: &[u8], compressed: bool) -> Result<Vec<u8>, String> {
    if !compressed {
        return Ok(payload.to_vec());
    }

    let mut decoder = ZlibDecoder::new(payload);
    let mut output = Vec::new();
    decoder
        .read_to_end(&mut output)
        .map_err(|error| error.to_string())?;
    Ok(output)
}

fn normalize_runtime_id(runtime_id: Option<String>) -> String {
    let normalized = runtime_id.unwrap_or_else(|| DEFAULT_RUNTIME_ID.to_string());
    let trimmed = normalized.trim();
    if trimmed.is_empty() {
        DEFAULT_RUNTIME_ID.to_string()
    } else {
        trimmed.to_string()
    }
}

fn emit_runtime_message(app: &AppHandle, runtime_id: &str, value: &Value) {
    let _ = app.emit(
        EXTENSION_RUNTIME_MESSAGE_EVENT,
        json!({
            "runtimeId": runtime_id,
            "message": value,
        }),
    );
}

fn emit_runtime_stderr(app: &AppHandle, runtime_id: &str, line: &str) {
    let _ = app.emit(
        EXTENSION_RUNTIME_STDERR_EVENT,
        json!({
            "runtimeId": runtime_id,
            "line": line,
        }),
    );
}

fn emit_runtime_exit(app: &AppHandle, runtime_id: &str) {
    let _ = app.emit(
        EXTENSION_RUNTIME_EXIT_EVENT,
        json!({
            "runtimeId": runtime_id,
        }),
    );
}

fn encode_message_base64<M: Message>(message: &M) -> Result<String, String> {
    let mut encoded = Vec::new();
    message
        .encode(&mut encoded)
        .map_err(|error| error.to_string())?;
    Ok(STANDARD.encode(encoded))
}

fn decode_message_base64(payload: &Value) -> Result<Vec<u8>, String> {
    let payload_object = payload
        .as_object()
        .ok_or_else(|| "manager bridge payload must be an object".to_string())?;
    let encoded = payload_object
        .get("messageBase64")
        .and_then(Value::as_str)
        .ok_or_else(|| "manager bridge payload is missing messageBase64".to_string())?;

    STANDARD.decode(encoded).map_err(|error| error.to_string())
}

fn manager_request_to_wire_message(request: &ManagerRequest) -> Result<Value, String> {
    Ok(json!({
        "kind": BRIDGE_MANAGER_REQUEST_KIND,
        "payload": {
            "requestId": request.request_id,
            "messageBase64": encode_message_base64(request)?,
        },
    }))
}

fn parse_manager_response_message(raw: &Value) -> Option<Result<(String, Vec<u8>), String>> {
    let record = raw.as_object()?;
    let kind = record.get("kind")?.as_str()?;
    if kind != BRIDGE_MANAGER_RESPONSE_KIND {
        return None;
    }

    let payload = record.get("payload")?;
    let object = match payload.as_object() {
        Some(value) => value,
        None => return Some(Err("manager response payload must be an object".to_string())),
    };
    let request_id = match object.get("requestId").and_then(Value::as_str) {
        Some(value) => value.trim().to_string(),
        None => {
            return Some(Err(
                "manager response payload is missing requestId".to_string()
            ))
        }
    };

    if request_id.is_empty() {
        return Some(Err(
            "manager response payload includes an empty requestId".to_string()
        ));
    }

    Some(decode_message_base64(payload).map(|bytes| (request_id, bytes)))
}

fn spawn_stdout_reader(
    app: AppHandle,
    runtime_id: String,
    stdout: ChildStdout,
    runtimes: Arc<Mutex<HashMap<String, ManagedRuntime>>>,
    pending_requests: Arc<Mutex<HashMap<String, HashMap<String, PendingSender>>>>,
) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);

        loop {
            let mut header = [0u8; 4];
            if let Err(error) = reader.read_exact(&mut header) {
                if error.kind() != std::io::ErrorKind::UnexpectedEof {
                    emit_runtime_stderr(
                        &app,
                        &runtime_id,
                        &format!("runtime stdout read failed: {error}"),
                    );
                }
                break;
            }

            let header_value = u32::from_be_bytes(header);
            let compressed = (header_value & 0x8000_0000) != 0;
            let payload_length = (header_value & 0x7fff_ffff) as usize;
            let mut payload = vec![0u8; payload_length];
            if let Err(error) = reader.read_exact(&mut payload) {
                emit_runtime_stderr(
                    &app,
                    &runtime_id,
                    &format!("runtime stdout payload read failed: {error}"),
                );
                break;
            }

            let decoded_payload = match maybe_inflate(&payload, compressed) {
                Ok(value) => value,
                Err(error) => {
                    emit_runtime_stderr(
                        &app,
                        &runtime_id,
                        &format!("runtime stdout inflate failed: {error}"),
                    );
                    continue;
                }
            };

            let decoded_value: Value = match serde_json::from_slice(&decoded_payload) {
                Ok(value) => value,
                Err(error) => {
                    emit_runtime_stderr(
                        &app,
                        &runtime_id,
                        &format!("runtime stdout decode failed: {error}"),
                    );
                    continue;
                }
            };

            if let Some(result) = parse_manager_response_message(&decoded_value) {
                match result {
                    Ok((request_id, response_bytes)) => {
                        let sender = pending_requests
                            .lock()
                            .get_mut(&runtime_id)
                            .and_then(|requests| requests.remove(&request_id));
                        if let Some(sender) = sender {
                            let _ = sender.send(Ok(response_bytes));
                        }
                    }
                    Err(error) => emit_runtime_stderr(
                        &app,
                        &runtime_id,
                        &format!("runtime manager response decode failed: {error}"),
                    ),
                }
                continue;
            }

            emit_runtime_message(&app, &runtime_id, &decoded_value);
        }

        runtimes.lock().remove(&runtime_id);

        let pending = pending_requests.lock().remove(&runtime_id);
        if let Some(pending) = pending {
            for (_, sender) in pending {
                let _ = sender.send(Err("extension runtime disconnected".to_string()));
            }
        }

        emit_runtime_exit(&app, &runtime_id);
    });
}

fn spawn_stderr_reader(app: AppHandle, runtime_id: String, stderr: ChildStderr) {
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            if !line.trim().is_empty() {
                emit_runtime_stderr(&app, &runtime_id, &line);
            }
        }
    });
}

impl ExtensionRuntimeBridgeState {
    fn ensure_started(&self, app: &AppHandle, runtime_id: &str) -> Result<(), String> {
        let mut runtimes = self.runtimes.lock();

        let runtime_exited = if let Some(managed) = runtimes.get_mut(runtime_id) {
            match managed
                .child
                .try_wait()
                .map_err(|error| error.to_string())?
            {
                None => return Ok(()),
                Some(_) => true,
            }
        } else {
            false
        };

        if runtime_exited {
            runtimes.remove(runtime_id);
        }

        let launcher = resolve_extension_runtime_launcher(app)?;
        let mut child = Command::new(&launcher.program)
            .args(&launcher.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| error.to_string())?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "failed to capture runtime stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "failed to capture runtime stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "failed to capture runtime stderr".to_string())?;

        let stdin = Arc::new(Mutex::new(BufWriter::new(stdin)));
        spawn_stdout_reader(
            app.clone(),
            runtime_id.to_string(),
            stdout,
            self.runtimes.clone(),
            self.pending_manager_requests.clone(),
        );
        spawn_stderr_reader(app.clone(), runtime_id.to_string(), stderr);

        runtimes.insert(runtime_id.to_string(), ManagedRuntime { child, stdin });
        Ok(())
    }

    fn stop_runtime(&self, runtime_id: &str) -> Result<(), String> {
        let mut runtimes = self.runtimes.lock();
        if let Some(mut managed) = runtimes.remove(runtime_id) {
            managed.child.kill().map_err(|error| error.to_string())?;
            let _ = managed.child.wait();
        }

        if let Some(pending) = self.pending_manager_requests.lock().remove(runtime_id) {
            for (_, sender) in pending {
                let _ = sender.send(Err("extension runtime stopped".to_string()));
            }
        }

        Ok(())
    }

    fn send_wire_message(
        &self,
        app: &AppHandle,
        runtime_id: &str,
        value: &Value,
    ) -> Result<(), String> {
        self.ensure_started(app, runtime_id)?;
        let runtimes = self.runtimes.lock();
        let stdin = runtimes
            .get(runtime_id)
            .ok_or_else(|| "extension runtime is not running".to_string())?
            .stdin
            .clone();
        drop(runtimes);
        write_json_line(&stdin, value)
    }
}

#[tauri::command]
pub fn extension_runtime_start(
    app: AppHandle,
    state: State<'_, ExtensionRuntimeBridgeState>,
    runtime_id: Option<String>,
) -> Result<bool, String> {
    let runtime_id = normalize_runtime_id(runtime_id);
    state.ensure_started(&app, &runtime_id)?;
    Ok(true)
}

#[tauri::command]
pub fn extension_runtime_stop(
    state: State<'_, ExtensionRuntimeBridgeState>,
    runtime_id: Option<String>,
) -> Result<(), String> {
    let runtime_id = normalize_runtime_id(runtime_id);
    state.stop_runtime(&runtime_id)
}

#[tauri::command]
pub fn extension_runtime_send_message(
    app: AppHandle,
    state: State<'_, ExtensionRuntimeBridgeState>,
    runtime_id: Option<String>,
    action: String,
    payload: Value,
) -> Result<(), String> {
    let runtime_id = normalize_runtime_id(runtime_id);
    state.send_wire_message(
        &app,
        &runtime_id,
        &json!({
            "kind": action,
            "payload": payload,
        }),
    )
}

#[tauri::command]
pub fn extension_runtime_send_manager_request(
    app: AppHandle,
    state: State<'_, ExtensionRuntimeBridgeState>,
    runtime_id: Option<String>,
    request: Vec<u8>,
) -> Result<Vec<u8>, String> {
    let runtime_id = normalize_runtime_id(runtime_id);
    let mut request =
        ManagerRequest::decode(request.as_slice()).map_err(|error| error.to_string())?;
    if request.request_id.is_empty() {
        request.request_id = nanoid!();
    }

    let wire_message = manager_request_to_wire_message(&request)?;
    let (sender, receiver) = mpsc::sync_channel(1);
    state
        .pending_manager_requests
        .lock()
        .entry(runtime_id.clone())
        .or_default()
        .insert(request.request_id.clone(), sender);

    if let Err(error) = state.send_wire_message(&app, &runtime_id, &wire_message) {
        let mut pending_requests = state.pending_manager_requests.lock();
        if let Some(requests) = pending_requests.get_mut(&runtime_id) {
            requests.remove(&request.request_id);
            if requests.is_empty() {
                pending_requests.remove(&runtime_id);
            }
        }
        return Err(error);
    }

    let response = match receiver.recv_timeout(MANAGER_REQUEST_TIMEOUT) {
        Ok(result) => result?,
        Err(error) => {
            let mut pending_requests = state.pending_manager_requests.lock();
            if let Some(requests) = pending_requests.get_mut(&runtime_id) {
                requests.remove(&request.request_id);
                if requests.is_empty() {
                    pending_requests.remove(&runtime_id);
                }
            }
            return Err(error.to_string());
        }
    };

    Ok(response)
}
