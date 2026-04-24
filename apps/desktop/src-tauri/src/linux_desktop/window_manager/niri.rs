use std::{
    collections::HashMap,
    env,
    io::{BufRead, BufReader, Write},
    net::Shutdown,
    os::unix::net::UnixStream,
};

use serde::Deserialize;
use serde_json::{json, Value};

use crate::applications::icon_resolver::IconResolver;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::super::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use super::super::environment::LinuxDesktopEnvironment;
use super::error::{Result, WindowManagerError};
use super::{build_window_entry, niri_window_id_prefix, FocusedWindowInfo, WindowProvider};

const NIRI_SOCKET_ENV: &str = "NIRI_SOCKET";

#[derive(Default)]
pub struct NiriWindowProvider;

#[derive(Debug, Clone, Deserialize)]
struct NiriWorkspace {
    id: u64,
    idx: u8,
    name: Option<String>,
    output: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct NiriWindow {
    id: u64,
    title: Option<String>,
    app_id: Option<String>,
    pid: Option<i32>,
    workspace_id: Option<u64>,
    is_focused: bool,
}

fn niri_socket_path() -> Result<String> {
    env::var(NIRI_SOCKET_ENV).map_err(|_| {
        WindowManagerError::BackendUnavailable(
            "niri IPC socket is unavailable; NIRI_SOCKET is not set".to_string(),
        )
    })
}

fn send_request(request: &Value) -> Result<Value> {
    let socket_path = niri_socket_path()?;
    let mut stream = UnixStream::connect(&socket_path).map_err(|error| {
        WindowManagerError::ConnectionError(format!(
            "failed to connect to niri IPC socket at '{socket_path}': {error}"
        ))
    })?;

    let payload = serde_json::to_vec(request).map_err(|error| {
        WindowManagerError::ParseError(format!("failed to serialize niri request: {error}"))
    })?;
    stream.write_all(&payload).map_err(|error| {
        WindowManagerError::CommandError(format!("failed to write niri IPC request: {error}"))
    })?;
    stream.write_all(b"\n").map_err(|error| {
        WindowManagerError::CommandError(format!("failed to terminate niri IPC request: {error}"))
    })?;
    stream.flush().map_err(|error| {
        WindowManagerError::CommandError(format!("failed to flush niri IPC request: {error}"))
    })?;
    let _ = stream.shutdown(Shutdown::Write);

    let mut response_line = String::new();
    let mut reader = BufReader::new(stream);
    reader.read_line(&mut response_line).map_err(|error| {
        WindowManagerError::QueryError(format!("failed to read niri IPC response: {error}"))
    })?;
    if response_line.trim().is_empty() {
        return Err(WindowManagerError::QueryError(
            "niri IPC returned an empty response".to_string(),
        ));
    }

    let response: Value = serde_json::from_str(response_line.trim()).map_err(|error| {
        WindowManagerError::ParseError(format!("failed to parse niri IPC response: {error}"))
    })?;

    if let Some(error) = response.get("Err") {
        return Err(WindowManagerError::CommandError(format!(
            "niri IPC returned an error: {}",
            error
        )));
    }

    response.get("Ok").cloned().ok_or_else(|| {
        WindowManagerError::ParseError(
            "niri IPC response did not contain an Ok payload".to_string(),
        )
    })
}

fn decode_variant<T>(request: Value, variant: &str) -> Result<T>
where
    T: for<'de> Deserialize<'de>,
{
    let payload = send_request(&request)?;
    let variant_payload = payload.get(variant).cloned().ok_or_else(|| {
        WindowManagerError::ParseError(format!(
            "niri IPC response did not contain the '{variant}' variant"
        ))
    })?;

    serde_json::from_value(variant_payload).map_err(|error| {
        WindowManagerError::ParseError(format!(
            "failed to decode niri IPC '{variant}' payload: {error}"
        ))
    })
}

fn workspace_label(workspace: &NiriWorkspace) -> String {
    if let Some(name) = workspace
        .name
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        return name.to_string();
    }

    if let Some(output) = workspace
        .output
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        return format!("{output}:{}", workspace.idx);
    }

    workspace.idx.to_string()
}

fn workspaces_by_id() -> Result<HashMap<u64, NiriWorkspace>> {
    let workspaces: Vec<NiriWorkspace> = decode_variant(json!("Workspaces"), "Workspaces")?;
    Ok(workspaces
        .into_iter()
        .map(|workspace| (workspace.id, workspace))
        .collect())
}

fn list_niri_windows() -> Result<Vec<NiriWindow>> {
    decode_variant(json!("Windows"), "Windows")
}

fn focused_niri_window() -> Result<Option<NiriWindow>> {
    decode_variant(json!("FocusedWindow"), "FocusedWindow")
}

fn parse_window_id(window_id: &str) -> Result<u64> {
    let raw = window_id
        .trim()
        .strip_prefix(niri_window_id_prefix())
        .unwrap_or(window_id)
        .trim();
    raw.parse::<u64>()
        .map_err(|_| WindowManagerError::InvalidWindowId("niri window id is invalid".to_string()))
}

fn action_request(action: Value) -> Result<()> {
    let _ = send_request(&json!({ "Action": action }))?;
    Ok(())
}

impl WindowProvider for NiriWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::Niri
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "niri"
            || env.compositor == "niri"
            || env::var_os(NIRI_SOCKET_ENV).is_some()
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(
        &self,
        state: &AppState,
        selected_icon_theme: Option<&str>,
    ) -> Result<Vec<WindowEntry>> {
        let workspaces = workspaces_by_id()?;
        let windows = list_niri_windows()?;
        let mut icon_resolver = IconResolver::new(selected_icon_theme.map(str::to_string));

        Ok(windows
            .iter()
            .map(|window| {
                let class_name = window.app_id.as_deref().unwrap_or_default();
                let pid = window
                    .pid
                    .and_then(|value| u32::try_from(value).ok())
                    .unwrap_or(0);
                let workspace = window
                    .workspace_id
                    .and_then(|workspace_id| workspaces.get(&workspace_id))
                    .map(workspace_label)
                    .unwrap_or_default();

                build_window_entry(
                    state,
                    &mut icon_resolver,
                    &format!("{}{}", niri_window_id_prefix(), window.id),
                    window.title.as_deref().unwrap_or_default(),
                    class_name,
                    window.app_id.as_deref(),
                    pid,
                    &workspace,
                    window.is_focused,
                )
            })
            .collect())
    }

    fn focus_window(&self, window_id: &str) -> Result<()> {
        let id = parse_window_id(window_id)?;
        action_request(json!({
            "FocusWindow": {
                "id": id
            }
        }))
    }

    fn close_window(&self, window_id: &str) -> Result<()> {
        let id = parse_window_id(window_id)?;
        action_request(json!({
            "CloseWindow": {
                "id": id
            }
        }))
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>> {
        let workspaces = workspaces_by_id()?;
        let Some(window) = focused_niri_window()? else {
            return Ok(None);
        };

        let class_name = window.app_id.clone().unwrap_or_default();
        let pid = window.pid.and_then(|value| u32::try_from(value).ok());
        let workspace = window
            .workspace_id
            .and_then(|workspace_id| workspaces.get(&workspace_id))
            .map(workspace_label)
            .unwrap_or_default();

        Ok(Some(FocusedWindowInfo {
            id: format!("{}{}", niri_window_id_prefix(), window.id),
            title: window.title.unwrap_or_default(),
            app_name: super::app_name_from_entry(state, pid.unwrap_or(0), &class_name),
            class_name: class_name.clone(),
            app_id: (!class_name.is_empty()).then_some(class_name),
            pid,
            workspace,
            is_focused: true,
        }))
    }
}
