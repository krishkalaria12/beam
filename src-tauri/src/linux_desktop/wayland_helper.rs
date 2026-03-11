use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::time::Duration;
use walkdir::WalkDir;

#[cfg(target_os = "linux")]
use wayland_client::{
    globals::{registry_queue_init, GlobalListContents},
    protocol::wl_registry,
    Connection, Dispatch, QueueHandle,
};
#[cfg(target_os = "linux")]
use wl_clipboard_rs::paste::{self, ClipboardType, MimeType, Seat};

use super::environment::LinuxDesktopEnvironment;

const HELPER_BINARY_NAME: &str = "beam-data-control-server";
const MAX_HELPER_RESTARTS: usize = 3;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum WaylandDataControlBackend {
    ExtDataControlV1,
    WlrDataControlV1,
    #[default]
    Unavailable,
}

impl WaylandDataControlBackend {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ExtDataControlV1 => "ext_data_control_v1",
            Self::WlrDataControlV1 => "wlr_data_control_v1",
            Self::Unavailable => "unavailable",
        }
    }

    fn from_interface_name(interface: &str) -> Option<Self> {
        match interface {
            "ext_data_control_manager_v1" => Some(Self::ExtDataControlV1),
            "zwlr_data_control_manager_v1" => Some(Self::WlrDataControlV1),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WaylandHelperStatus {
    pub available: bool,
    pub backend: Option<String>,
    pub helper_path: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum HelperRequestAction {
    ReadPrimarySelection,
    ReadClipboardSelection,
    Shutdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HelperRequest {
    id: u64,
    action: HelperRequestAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum HelperMessageKind {
    Startup,
    Response,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HelperSelectionResponse {
    pub mime_types: Vec<String>,
    pub text: Option<String>,
    pub file_uris: Vec<String>,
    pub backend: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HelperMessage {
    kind: HelperMessageKind,
    #[serde(default)]
    id: Option<u64>,
    #[serde(default)]
    available: Option<bool>,
    #[serde(default)]
    backend: Option<String>,
    #[serde(default)]
    helper_path: Option<String>,
    #[serde(default)]
    mime_types: Vec<String>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    file_uris: Vec<String>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Default)]
struct ProtocolDiscoveryState;

#[cfg(target_os = "linux")]
impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for ProtocolDiscoveryState {
    fn event(
        _state: &mut Self,
        _proxy: &wl_registry::WlRegistry,
        _event: wl_registry::Event,
        _data: &GlobalListContents,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
    }
}

struct HelperProcess {
    child: Child,
    writer: BufWriter<ChildStdin>,
    reader: BufReader<ChildStdout>,
    next_request_id: u64,
    status: WaylandHelperStatus,
}

struct HelperLaunchSpec {
    executable: PathBuf,
    args: Vec<String>,
    helper_path: String,
}

impl HelperProcess {
    fn spawn() -> Result<Self, String> {
        let launch_spec = locate_helper_launch_spec().ok_or_else(|| {
            format!("could not locate {HELPER_BINARY_NAME} or a helper launcher near the Beam binary")
        })?;

        let mut child = Command::new(&launch_spec.executable)
            .args(&launch_spec.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|error| format!("failed to spawn {HELPER_BINARY_NAME}: {error}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "failed to capture helper stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "failed to capture helper stdout".to_string())?;

        let mut process = Self {
            child,
            writer: BufWriter::new(stdin),
            reader: BufReader::new(stdout),
            next_request_id: 1,
            status: WaylandHelperStatus {
                available: false,
                backend: None,
                helper_path: Some(launch_spec.helper_path),
                last_error: None,
            },
        };

        let startup = process.read_message()?;
        if !matches!(startup.kind, HelperMessageKind::Startup) {
            return Err("helper did not emit a startup message".to_string());
        }

        process.status.available = startup.available.unwrap_or(false);
        process.status.backend = startup.backend.clone();
        process.status.last_error = startup.error.clone();

        if !process.status.available {
            return Err(
                process
                    .status
                    .last_error
                    .clone()
                    .unwrap_or_else(|| "helper did not find a supported Wayland data-control backend".to_string()),
            );
        }

        Ok(process)
    }

    fn read_message(&mut self) -> Result<HelperMessage, String> {
        let mut line = String::new();
        let read = self
            .reader
            .read_line(&mut line)
            .map_err(|error| format!("failed to read helper output: {error}"))?;
        if read == 0 {
            return Err("helper exited unexpectedly".to_string());
        }
        serde_json::from_str::<HelperMessage>(line.trim()).map_err(|error| {
            format!("failed to parse helper output '{line}': {error}")
        })
    }

    fn request(
        &mut self,
        action: HelperRequestAction,
    ) -> Result<HelperSelectionResponse, String> {
        let request_id = self.next_request_id;
        self.next_request_id = self.next_request_id.saturating_add(1);

        let payload = serde_json::to_string(&HelperRequest {
            id: request_id,
            action,
        })
        .map_err(|error| format!("failed to serialize helper request: {error}"))?;

        self.writer
            .write_all(payload.as_bytes())
            .and_then(|_| self.writer.write_all(b"\n"))
            .and_then(|_| self.writer.flush())
            .map_err(|error| format!("failed to send helper request: {error}"))?;

        loop {
            let message = self.read_message()?;
            if !matches!(message.kind, HelperMessageKind::Response) {
                continue;
            }
            if message.id != Some(request_id) {
                continue;
            }

            return Ok(HelperSelectionResponse {
                mime_types: message.mime_types,
                text: message.text,
                file_uris: message.file_uris,
                backend: message.backend,
                error: message.error,
            });
        }
    }

    fn shutdown(&mut self) {
        let payload = serde_json::to_string(&HelperRequest {
            id: self.next_request_id,
            action: HelperRequestAction::Shutdown,
        });
        if let Ok(payload) = payload {
            let _ = self.writer.write_all(payload.as_bytes());
            let _ = self.writer.write_all(b"\n");
            let _ = self.writer.flush();
        }
        let _ = self.child.wait_timeout(Duration::from_millis(150));
        let _ = self.child.kill();
    }
}

trait WaitTimeoutExt {
    fn wait_timeout(&mut self, timeout: Duration) -> std::io::Result<Option<std::process::ExitStatus>>;
}

impl WaitTimeoutExt for Child {
    fn wait_timeout(
        &mut self,
        timeout: Duration,
    ) -> std::io::Result<Option<std::process::ExitStatus>> {
        let started = std::time::Instant::now();
        loop {
            if let Some(status) = self.try_wait()? {
                return Ok(Some(status));
            }
            if started.elapsed() >= timeout {
                return Ok(None);
            }
            std::thread::sleep(Duration::from_millis(15));
        }
    }
}

#[derive(Default)]
struct WaylandHelperSupervisor {
    process: Option<HelperProcess>,
    status: WaylandHelperStatus,
}

impl WaylandHelperSupervisor {
    fn status(&mut self, env: &LinuxDesktopEnvironment) -> WaylandHelperStatus {
        if env.session_type != "wayland" {
            self.status = WaylandHelperStatus {
                available: false,
                backend: None,
                helper_path: locate_helper_launch_spec().map(|spec| spec.helper_path),
                last_error: Some("Wayland helper is only used on Wayland sessions".to_string()),
            };
            return self.status.clone();
        }

        if self.process.is_some() {
            return self.status.clone();
        }

        match self.ensure_process() {
            Ok(_) => self.status.clone(),
            Err(error) => {
                self.status.available = false;
                self.status.last_error = Some(error);
                self.status.helper_path = locate_helper_launch_spec().map(|spec| spec.helper_path);
                self.status.clone()
            }
        }
    }

    fn ensure_process(&mut self) -> Result<(), String> {
        if self.process.is_some() {
            return Ok(());
        }

        let mut last_error = None;
        for attempt in 0..MAX_HELPER_RESTARTS {
            match HelperProcess::spawn() {
                Ok(process) => {
                    self.status = process.status.clone();
                    self.process = Some(process);
                    return Ok(());
                }
                Err(error) => {
                    last_error = Some(error);
                    std::thread::sleep(Duration::from_millis(50 * (attempt as u64 + 1)));
                }
            }
        }

        Err(last_error.unwrap_or_else(|| "helper failed to start".to_string()))
    }

    fn request(
        &mut self,
        env: &LinuxDesktopEnvironment,
        action: HelperRequestAction,
    ) -> Result<HelperSelectionResponse, String> {
        self.status(env);
        self.ensure_process()?;

        let Some(process) = self.process.as_mut() else {
            return Err("helper is unavailable".to_string());
        };

        match process.request(action.clone()) {
            Ok(response) => Ok(response),
            Err(error) => {
                process.shutdown();
                self.process = None;
                self.status.available = false;
                self.status.last_error = Some(error.clone());
                Err(error)
            }
        }
    }
}

static WAYLAND_HELPER: Lazy<Mutex<WaylandHelperSupervisor>> =
    Lazy::new(|| Mutex::new(WaylandHelperSupervisor::default()));

pub fn helper_status(env: &LinuxDesktopEnvironment) -> WaylandHelperStatus {
    WAYLAND_HELPER.lock().status(env)
}

pub fn read_primary_selection(env: &LinuxDesktopEnvironment) -> Result<HelperSelectionResponse, String> {
    WAYLAND_HELPER
        .lock()
        .request(env, HelperRequestAction::ReadPrimarySelection)
}

pub fn read_clipboard_selection(
    env: &LinuxDesktopEnvironment,
) -> Result<HelperSelectionResponse, String> {
    WAYLAND_HELPER
        .lock()
        .request(env, HelperRequestAction::ReadClipboardSelection)
}

fn locate_helper_launch_spec() -> Option<HelperLaunchSpec> {
    if let Some(helper_path) = locate_packaged_helper_binary() {
        return Some(HelperLaunchSpec {
            executable: helper_path.clone(),
            args: Vec::new(),
            helper_path: helper_path.display().to_string(),
        });
    }

    let current_exe = normalize_path(std::env::current_exe().ok()?);
    Some(HelperLaunchSpec {
        executable: current_exe.clone(),
        args: vec!["__wayland-data-control-helper".to_string()],
        helper_path: format!("{} __wayland-data-control-helper", current_exe.display()),
    })
}

fn locate_packaged_helper_binary() -> Option<PathBuf> {
    let current_exe = std::env::current_exe().ok()?;
    let current_dir = current_exe.parent()?;
    let target_suffix = helper_target_suffix();
    let direct_candidates = [
        current_dir.join(HELPER_BINARY_NAME),
        current_dir.join(format!("{HELPER_BINARY_NAME}.exe")),
        current_dir.join(format!("{HELPER_BINARY_NAME}-{target_suffix}")),
        current_dir.join("..").join(HELPER_BINARY_NAME),
        current_dir.join("..").join(format!("{HELPER_BINARY_NAME}-{target_suffix}")),
        current_dir.join("../bin").join(HELPER_BINARY_NAME),
        current_dir
            .join("../bin")
            .join(format!("{HELPER_BINARY_NAME}-{target_suffix}")),
        current_dir.join("../Resources").join(HELPER_BINARY_NAME),
        current_dir
            .join("../Resources")
            .join(format!("{HELPER_BINARY_NAME}-{target_suffix}")),
    ];

    if let Some(path) = direct_candidates
        .into_iter()
        .map(normalize_path)
        .find(|path| path.is_file())
    {
        return Some(path);
    }

    for root in [
        current_dir.to_path_buf(),
        current_dir.join(".."),
        current_dir.join("../bin"),
        current_dir.join("../Resources"),
    ] {
        let root = normalize_path(root);
        if !root.exists() {
            continue;
        }

        for entry in WalkDir::new(root)
            .max_depth(3)
            .follow_links(true)
            .into_iter()
            .filter_map(Result::ok)
        {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };

            if file_name == HELPER_BINARY_NAME
                || file_name == format!("{HELPER_BINARY_NAME}.exe")
                || file_name.starts_with(&format!("{HELPER_BINARY_NAME}-"))
            {
                return Some(normalize_path(path.to_path_buf()));
            }
        }
    }

    None
}

fn helper_target_suffix() -> String {
    #[cfg(target_os = "linux")]
    {
        format!("{}-unknown-linux-gnu", std::env::consts::ARCH)
    }

    #[cfg(not(target_os = "linux"))]
    {
        format!("{}-{}", std::env::consts::ARCH, std::env::consts::OS)
    }
}

fn normalize_path(path: PathBuf) -> PathBuf {
    fs::canonicalize(&path).unwrap_or(path)
}

#[cfg(target_os = "linux")]
fn detect_backend() -> Result<WaylandDataControlBackend, String> {
    let conn = Connection::connect_to_env()
        .map_err(|error| format!("failed to connect to Wayland compositor: {error}"))?;
    let (globals, _queue) = registry_queue_init::<ProtocolDiscoveryState>(&conn)
        .map_err(|error| format!("failed to enumerate Wayland globals: {error}"))?;
    let entries = globals.contents().clone_list();

    for global in entries {
        if let Some(backend) = WaylandDataControlBackend::from_interface_name(&global.interface) {
            return Ok(backend);
        }
    }

    Ok(WaylandDataControlBackend::Unavailable)
}

#[cfg(not(target_os = "linux"))]
fn detect_backend() -> Result<WaylandDataControlBackend, String> {
    Ok(WaylandDataControlBackend::Unavailable)
}

#[cfg(target_os = "linux")]
fn read_selection(clipboard: ClipboardType) -> Result<HelperSelectionResponse, String> {
    let mime_types = paste::get_mime_types_ordered(clipboard, Seat::Unspecified)
        .map_err(|error| format!("failed to read offered MIME types: {error}"))?;
    let backend = detect_backend()?.as_str().to_string();
    let text = read_text_content(clipboard, &mime_types);
    let file_uris = read_file_content(clipboard, &mime_types);

    Ok(HelperSelectionResponse {
        mime_types,
        text,
        file_uris,
        backend: Some(backend),
        error: None,
    })
}

#[cfg(target_os = "linux")]
fn read_text_content(clipboard: ClipboardType, mime_types: &[String]) -> Option<String> {
    for mime in [
        "text/plain;charset=utf-8",
        "UTF8_STRING",
        "text/plain",
        "STRING",
    ] {
        if !mime_types.iter().any(|item| item == mime) {
            continue;
        }
        if let Ok((mut pipe, _)) =
            paste::get_contents(clipboard, Seat::Unspecified, MimeType::Specific(mime))
        {
            let mut contents = String::new();
            if pipe.read_to_string(&mut contents).is_ok() {
                let trimmed = contents.trim_matches('\0').trim().to_string();
                if !trimmed.is_empty() {
                    return Some(trimmed);
                }
            }
        }
    }

    paste::get_contents(clipboard, Seat::Unspecified, MimeType::Text)
        .ok()
        .and_then(|(mut pipe, _)| {
            let mut contents = String::new();
            pipe.read_to_string(&mut contents).ok()?;
            let trimmed = contents.trim_matches('\0').trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        })
}

#[cfg(target_os = "linux")]
fn read_file_content(clipboard: ClipboardType, mime_types: &[String]) -> Vec<String> {
    for mime in ["text/uri-list", "x-special/gnome-copied-files"] {
        if !mime_types.iter().any(|item| item == mime) {
            continue;
        }

        if let Ok((mut pipe, _)) =
            paste::get_contents(clipboard, Seat::Unspecified, MimeType::Specific(mime))
        {
            let mut contents = String::new();
            if pipe.read_to_string(&mut contents).is_ok() {
                let uris = parse_file_uris(mime, &contents);
                if !uris.is_empty() {
                    return uris;
                }
            }
        }
    }

    Vec::new()
}

fn parse_file_uris(mime: &str, contents: &str) -> Vec<String> {
    match mime {
        "text/uri-list" => contents
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty() && !line.starts_with('#'))
            .map(ToString::to_string)
            .collect(),
        "x-special/gnome-copied-files" => contents
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty() && *line != "copy" && *line != "cut")
            .map(ToString::to_string)
            .collect(),
        _ => Vec::new(),
    }
}

pub fn run_helper_main() -> Result<(), String> {
    let backend = detect_backend()?;
    let available = !matches!(backend, WaylandDataControlBackend::Unavailable);
    let startup = HelperMessage {
        kind: HelperMessageKind::Startup,
        id: None,
        available: Some(available),
        backend: available.then(|| backend.as_str().to_string()),
        helper_path: locate_helper_launch_spec().map(|spec| spec.helper_path),
        mime_types: Vec::new(),
        text: None,
        file_uris: Vec::new(),
        error: (!available).then(|| {
            "no supported Wayland data-control protocol was found on this session".to_string()
        }),
    };
    write_helper_message(&startup)?;

    let stdin = std::io::stdin();
    let mut reader = BufReader::new(stdin.lock());
    let mut line = String::new();

    loop {
        line.clear();
        let read = reader
            .read_line(&mut line)
            .map_err(|error| format!("failed to read helper stdin: {error}"))?;
        if read == 0 {
            return Ok(());
        }

        let request: HelperRequest = serde_json::from_str(line.trim())
            .map_err(|error| format!("failed to parse helper request: {error}"))?;

        match request.action {
            HelperRequestAction::Shutdown => return Ok(()),
            HelperRequestAction::ReadPrimarySelection => {
                let response = respond_to_request(request.id, read_selection(ClipboardType::Primary));
                write_helper_message(&response)?;
            }
            HelperRequestAction::ReadClipboardSelection => {
                let response = respond_to_request(request.id, read_selection(ClipboardType::Regular));
                write_helper_message(&response)?;
            }
        }
    }
}

fn respond_to_request(
    id: u64,
    response: Result<HelperSelectionResponse, String>,
) -> HelperMessage {
    match response {
        Ok(response) => HelperMessage {
            kind: HelperMessageKind::Response,
            id: Some(id),
            available: Some(true),
            backend: response.backend,
            helper_path: None,
            mime_types: response.mime_types,
            text: response.text,
            file_uris: response.file_uris,
            error: response.error,
        },
        Err(error) => HelperMessage {
            kind: HelperMessageKind::Response,
            id: Some(id),
            available: Some(false),
            backend: None,
            helper_path: None,
            mime_types: Vec::new(),
            text: None,
            file_uris: Vec::new(),
            error: Some(error),
        },
    }
}

fn write_helper_message(message: &HelperMessage) -> Result<(), String> {
    let stdout = std::io::stdout();
    let mut writer = BufWriter::new(stdout.lock());
    let payload = serde_json::to_string(message)
        .map_err(|error| format!("failed to serialize helper message: {error}"))?;
    writer
        .write_all(payload.as_bytes())
        .and_then(|_| writer.write_all(b"\n"))
        .and_then(|_| writer.flush())
        .map_err(|error| format!("failed to write helper message: {error}"))
}

#[cfg(test)]
mod tests {
    use super::parse_file_uris;

    #[test]
    fn parses_uri_lists() {
        let uris = parse_file_uris(
            "text/uri-list",
            "file:///tmp/example.txt\n# ignored\nfile:///tmp/second.txt\n",
        );
        assert_eq!(
            uris,
            vec![
                "file:///tmp/example.txt".to_string(),
                "file:///tmp/second.txt".to_string()
            ]
        );
    }

    #[test]
    fn parses_gnome_copied_files() {
        let uris = parse_file_uris(
            "x-special/gnome-copied-files",
            "copy\nfile:///tmp/example.txt\nfile:///tmp/second.txt\n",
        );
        assert_eq!(
            uris,
            vec![
                "file:///tmp/example.txt".to_string(),
                "file:///tmp/second.txt".to_string()
            ]
        );
    }
}
