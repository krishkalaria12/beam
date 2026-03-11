use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::mpsc::{self, Receiver, SyncSender};
use std::time::Duration;
use zbus::blocking::{connection::Builder as ConnectionBuilder, Connection, Proxy};
use zbus::interface;

use super::error::{LinuxDesktopError, Result};

const KWIN_SERVICE: &str = "org.kde.KWin";
const KWIN_SCRIPTING_PATH: &str = "/Scripting";
const KWIN_SCRIPTING_INTERFACE: &str = "org.kde.kwin.Scripting";
const KWIN_SCRIPT_INTERFACE: &str = "org.kde.kwin.Script";
const CALLBACK_PATH: &str = "/app/beam/KdeBridge";
const CALLBACK_INTERFACE: &str = "app.beam.KdeBridge";

#[derive(Debug, Clone)]
pub struct KdeWindowMetadata {
    pub id: String,
    pub title: String,
    pub app_name_hint: String,
    pub class_hint: String,
    pub desktop_file: Option<String>,
    pub icon_hint: String,
    pub is_active: bool,
    pub pid: Option<u32>,
    pub closeable: bool,
    pub workspace: String,
}

#[derive(Debug, Clone, Copy)]
enum ScriptAction {
    Focus,
    Close,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScriptWindowRecord {
    internal_id: String,
    title: String,
    desktop_file_name: Option<String>,
    resource_class: Option<String>,
    resource_name: Option<String>,
    icon_name: Option<String>,
    pid: Option<u32>,
    active: bool,
    closeable: bool,
    workspaces: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScriptActionResponse {
    ok: bool,
    found: bool,
}

#[derive(Debug)]
struct CallbackBridge {
    sender: Mutex<Option<SyncSender<(String, String)>>>,
}

#[interface(name = "app.beam.KdeBridge")]
impl CallbackBridge {
    fn publish(&self, token: &str, payload: &str) -> bool {
        self.sender
            .lock()
            .as_ref()
            .map(|sender| {
                sender
                    .send((token.to_string(), payload.to_string()))
                    .is_ok()
            })
            .unwrap_or(false)
    }
}

static KDE_SUPPORTS_SCRIPT: Lazy<bool> =
    Lazy::new(|| list_windows_via_script().map(|_| true).unwrap_or(false));
static KDE_SUPPORTS_CLOSE: Lazy<bool> =
    Lazy::new(|| *KDE_SUPPORTS_SCRIPT || kwin_supports_method("closeWindow"));

pub fn qdbus_binary() -> Option<&'static str> {
    ["qdbus6", "qdbus"].into_iter().find(|binary| {
        Command::new(binary)
            .arg("--version")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    })
}

pub fn call_qdbus(args: &[&str]) -> Result<String> {
    let binary = qdbus_binary().ok_or_else(|| {
        LinuxDesktopError::ApplicationLookupError("qdbus is unavailable".to_string())
    })?;
    let output = Command::new(binary).args(args).output().map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!("failed to execute {binary}: {error}"))
    })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(LinuxDesktopError::ApplicationLookupError(
            stderr.trim().to_string(),
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn supports_close() -> bool {
    *KDE_SUPPORTS_CLOSE
}

pub fn is_available() -> bool {
    *KDE_SUPPORTS_SCRIPT || qdbus_binary().is_some()
}

pub fn list_windows() -> Result<Vec<KdeWindowMetadata>> {
    if *KDE_SUPPORTS_SCRIPT {
        return list_windows_via_script();
    }

    let output = call_qdbus(&[KWIN_SERVICE, "/WindowsRunner", "org.kde.krunner1.Match", ""])?;
    let active_id = active_window_id();
    Ok(parse_krunner_windows(&output, active_id.as_deref()))
}

pub fn focus_window(window_id: &str) -> Result<()> {
    if *KDE_SUPPORTS_SCRIPT {
        if run_action_via_script(ScriptAction::Focus, window_id)? {
            return Ok(());
        }
    }

    call_qdbus(&[
        KWIN_SERVICE,
        "/WindowsRunner",
        "org.kde.krunner1.Run",
        window_id.trim(),
        "",
    ])
    .map(|_| ())
}

pub fn close_window(window_id: &str) -> Result<()> {
    if *KDE_SUPPORTS_SCRIPT && run_action_via_script(ScriptAction::Close, window_id)? {
        return Ok(());
    }

    if !*KDE_SUPPORTS_CLOSE {
        return Err(LinuxDesktopError::ApplicationLookupError(
            "KWin does not expose closeWindow on this system".to_string(),
        ));
    }

    call_qdbus(&[
        KWIN_SERVICE,
        "/KWin",
        "org.kde.KWin.closeWindow",
        window_id.trim(),
    ])
    .map(|_| ())
}

pub fn active_window_id() -> Option<String> {
    call_qdbus(&[KWIN_SERVICE, "/KWin", "org.kde.KWin.activeWindow"])
        .ok()
        .and_then(|output| extract_active_window_id(&output))
}

fn list_windows_via_script() -> Result<Vec<KdeWindowMetadata>> {
    let token = unique_token();
    let (connection, receiver, service_name) = create_callback_connection()?;
    let script_body = build_query_script(&service_name, &token);
    let script_handle = load_kwin_script(&connection, &script_body, "beam-kde-query")?;

    let response = execute_script_and_wait(
        &connection,
        &script_handle,
        &receiver,
        &token,
        Duration::from_secs(2),
    )?;
    stop_script(&connection, &script_handle);

    let windows: Vec<ScriptWindowRecord> = serde_json::from_str(&response).map_err(|error| {
        LinuxDesktopError::ParseError(format!(
            "failed to parse scripted KDE window payload: {error}"
        ))
    })?;

    Ok(windows
        .into_iter()
        .filter(|window| !window.title.trim().is_empty())
        .map(|window| KdeWindowMetadata {
            id: window.internal_id,
            title: window.title,
            app_name_hint: window
                .desktop_file_name
                .clone()
                .or(window.resource_class.clone())
                .or(window.resource_name.clone())
                .unwrap_or_default(),
            class_hint: window
                .resource_class
                .clone()
                .or(window.resource_name.clone())
                .unwrap_or_default(),
            desktop_file: window.desktop_file_name,
            icon_hint: window.icon_name.unwrap_or_default(),
            is_active: window.active,
            pid: window.pid.filter(|pid| *pid > 0),
            closeable: window.closeable,
            workspace: window
                .workspaces
                .into_iter()
                .find(|name| !name.trim().is_empty())
                .unwrap_or_default(),
        })
        .collect())
}

fn run_action_via_script(action: ScriptAction, window_id: &str) -> Result<bool> {
    let token = unique_token();
    let (connection, receiver, service_name) = create_callback_connection()?;
    let script_body = build_action_script(&service_name, &token, action, window_id);
    let script_handle = load_kwin_script(&connection, &script_body, "beam-kde-action")?;

    let response = execute_script_and_wait(
        &connection,
        &script_handle,
        &receiver,
        &token,
        Duration::from_secs(2),
    )?;
    stop_script(&connection, &script_handle);

    let response: ScriptActionResponse = serde_json::from_str(&response).map_err(|error| {
        LinuxDesktopError::ParseError(format!(
            "failed to parse KDE script action response: {error}"
        ))
    })?;
    Ok(response.ok && response.found)
}

fn create_callback_connection() -> Result<(Connection, Receiver<(String, String)>, String)> {
    let (sender, receiver) = mpsc::sync_channel(1);
    let service_name = format!(
        "app.beam.kdebridge.n{}.n{}",
        std::process::id(),
        nanoid::nanoid!(8).to_lowercase()
    );
    let connection = ConnectionBuilder::session()
        .map_err(|error| {
            LinuxDesktopError::ApplicationLookupError(format!(
                "failed to connect to session bus: {error}"
            ))
        })?
        .name(service_name.as_str())
        .map_err(|error| {
            LinuxDesktopError::ApplicationLookupError(format!(
                "failed to claim KDE bridge bus name: {error}"
            ))
        })?
        .serve_at(
            CALLBACK_PATH,
            CallbackBridge {
                sender: Mutex::new(Some(sender)),
            },
        )
        .map_err(|error| {
            LinuxDesktopError::ApplicationLookupError(format!(
                "failed to register KDE bridge object: {error}"
            ))
        })?
        .build()
        .map_err(|error| {
            LinuxDesktopError::ApplicationLookupError(format!(
                "failed to start KDE bridge bus connection: {error}"
            ))
        })?;

    Ok((connection, receiver, service_name))
}

fn load_kwin_script(
    connection: &Connection,
    script_body: &str,
    label: &str,
) -> Result<KdeScriptHandle> {
    let script_path = write_temp_script(script_body, label)?;
    let scripting_proxy = Proxy::new(
        connection,
        KWIN_SERVICE,
        KWIN_SCRIPTING_PATH,
        KWIN_SCRIPTING_INTERFACE,
    )
    .map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!(
            "failed to create KDE scripting proxy: {error}"
        ))
    })?;

    let script_id = scripting_proxy
        .call::<_, _, u32>(
            "loadScript",
            &(script_path.to_string_lossy().to_string(), label.to_string()),
        )
        .or_else(|_| {
            scripting_proxy
                .call::<_, _, u32>("loadScript", &(script_path.to_string_lossy().to_string(),))
        })
        .map_err(|error| {
            LinuxDesktopError::ApplicationLookupError(format!("failed to load KDE script: {error}"))
        })?;

    Ok(KdeScriptHandle {
        path: format!("/Scripting/Script{script_id}"),
        script_path,
    })
}

fn execute_script_and_wait(
    connection: &Connection,
    script_handle: &KdeScriptHandle,
    receiver: &Receiver<(String, String)>,
    token: &str,
    timeout: Duration,
) -> Result<String> {
    let script_proxy = Proxy::new(
        connection,
        KWIN_SERVICE,
        script_handle.path.as_str(),
        KWIN_SCRIPT_INTERFACE,
    )
    .map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!(
            "failed to create KDE script proxy {}: {error}",
            script_handle.path
        ))
    })?;

    script_proxy.call::<_, _, ()>("run", &()).map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!("failed to run KDE script: {error}"))
    })?;

    let (received_token, payload) = receiver.recv_timeout(timeout).map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!(
            "timed out waiting for KDE script callback: {error}"
        ))
    })?;

    if received_token != token {
        return Err(LinuxDesktopError::ParseError(
            "received mismatched KDE script callback token".to_string(),
        ));
    }

    Ok(payload)
}

fn stop_script(connection: &Connection, script_handle: &KdeScriptHandle) {
    if let Ok(script_proxy) = Proxy::new(
        connection,
        KWIN_SERVICE,
        script_handle.path.as_str(),
        KWIN_SCRIPT_INTERFACE,
    ) {
        let _: std::result::Result<(), _> = script_proxy.call("stop", &());
    }
    let _ = fs::remove_file(&script_handle.script_path);
}

fn write_temp_script(script_body: &str, label: &str) -> Result<PathBuf> {
    let path = std::env::temp_dir().join(format!("{label}-{}.js", nanoid::nanoid!(10)));
    fs::write(&path, script_body).map_err(|error| {
        LinuxDesktopError::ApplicationLookupError(format!(
            "failed to write temporary KDE script {}: {error}",
            path.display()
        ))
    })?;
    Ok(path)
}

fn unique_token() -> String {
    nanoid::nanoid!(16)
}

fn build_query_script(service_name: &str, token: &str) -> String {
    format!(
        r#"
function beamWindowList() {{
  if (workspace.windowList) {{
    return workspace.windowList();
  }}
  if (workspace.clientList) {{
    return workspace.clientList();
  }}
  return [];
}}

function beamWorkspaceNames(window) {{
  var names = [];
  try {{
    if (window.desktops) {{
      for (var index = 0; index < window.desktops.length; index++) {{
        var desktop = window.desktops[index];
        if (desktop && desktop.name) {{
          names.push(String(desktop.name));
        }} else if (workspace.desktopName) {{
          names.push(String(workspace.desktopName(desktop)));
        }}
      }}
    }}
  }} catch (error) {{}}
  return names;
}}

var result = [];
var windows = beamWindowList();

for (var i = 0; i < windows.length; i++) {{
  var window = windows[i];
  if (!window || window.deleted || !window.managed || window.popupWindow || window.specialWindow) {{
    continue;
  }}

  result.push({{
    internalId: String(window.internalId || ""),
    title: String(window.caption || ""),
    desktopFileName: window.desktopFileName ? String(window.desktopFileName) : null,
    resourceClass: window.resourceClass ? String(window.resourceClass) : null,
    resourceName: window.resourceName ? String(window.resourceName) : null,
    iconName: window.icon ? String(window.icon) : null,
    pid: window.pid ? Number(window.pid) : null,
    active: !!window.active,
    closeable: !!window.closeable,
    workspaces: beamWorkspaceNames(window)
  }});
}}

callDBus("{service_name}", "{CALLBACK_PATH}", "{CALLBACK_INTERFACE}", "Publish", "{token}", JSON.stringify(result));
"#
    )
}

fn build_action_script(
    service_name: &str,
    token: &str,
    action: ScriptAction,
    window_id: &str,
) -> String {
    let action_name = match action {
        ScriptAction::Focus => "focus",
        ScriptAction::Close => "close",
    };
    let escaped_window_id = window_id.replace('\\', "\\\\").replace('"', "\\\"");

    format!(
        r#"
function beamWindowList() {{
  if (workspace.windowList) {{
    return workspace.windowList();
  }}
  if (workspace.clientList) {{
    return workspace.clientList();
  }}
  return [];
}}

var targetId = "{escaped_window_id}";
var action = "{action_name}";
var windows = beamWindowList();
var response = {{ ok: false, found: false }};

for (var index = 0; index < windows.length; index++) {{
  var window = windows[index];
  if (!window || String(window.internalId || "") !== targetId) {{
    continue;
  }}

  response.found = true;

  if (action === "focus") {{
    workspace.activeWindow = window;
    response.ok = true;
  }} else if (action === "close") {{
    if (window.closeable) {{
      window.closeWindow();
      response.ok = true;
    }}
  }}

  break;
}}

callDBus("{service_name}", "{CALLBACK_PATH}", "{CALLBACK_INTERFACE}", "Publish", "{token}", JSON.stringify(response));
"#
    )
}

fn parse_krunner_windows(output: &str, active_id: Option<&str>) -> Vec<KdeWindowMetadata> {
    let mut windows = Vec::new();
    let mut string_fields: Vec<String> = Vec::new();
    let mut in_struct = false;

    for raw_line in output.lines() {
        let line = raw_line.trim();
        if line.starts_with("struct {") {
            in_struct = true;
            string_fields.clear();
            continue;
        }
        if line == "}" && in_struct {
            in_struct = false;
            if let Some(window) = parse_krunner_match_fields(&string_fields, active_id) {
                if !window.title.trim().is_empty() {
                    windows.push(window);
                }
            }
            continue;
        }
        if !in_struct {
            continue;
        }

        if let Some(value) = line.strip_prefix("string ") {
            string_fields.push(value.trim().trim_matches('"').to_string());
        }
    }

    windows.sort_by(|left, right| left.id.cmp(&right.id));
    windows.dedup_by(|left, right| left.id == right.id);
    windows
}

fn parse_krunner_match_fields(
    fields: &[String],
    active_id: Option<&str>,
) -> Option<KdeWindowMetadata> {
    let id = fields.first()?.trim().to_string();
    let title = fields.get(1)?.trim().to_string();
    if id.is_empty() || title.is_empty() {
        return None;
    }

    let mut app_name_hint = String::new();
    let mut class_hint = String::new();
    let mut icon_hint = String::new();

    for field in fields.iter().skip(2).map(|field| field.trim()) {
        if field.is_empty() {
            continue;
        }

        if class_hint.is_empty()
            && (field.ends_with(".desktop")
                || field.contains("org.kde.")
                || field.contains('.')
                || field.contains('-'))
        {
            class_hint = field.to_string();
            continue;
        }

        if icon_hint.is_empty()
            && !field.contains(' ')
            && !field.ends_with(".desktop")
            && !field.starts_with("window")
        {
            icon_hint = field.to_string();
            continue;
        }

        if app_name_hint.is_empty() && field != title && field != id {
            app_name_hint = field.to_string();
        }
    }

    let desktop_file = if class_hint.trim().ends_with(".desktop") {
        Some(class_hint.trim().to_string())
    } else {
        None
    };

    Some(KdeWindowMetadata {
        id: id.clone(),
        title,
        app_name_hint,
        class_hint,
        desktop_file,
        icon_hint,
        is_active: active_id == Some(id.as_str()),
        pid: None,
        closeable: *KDE_SUPPORTS_CLOSE,
        workspace: String::new(),
    })
}

fn extract_active_window_id(output: &str) -> Option<String> {
    output
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.trim_matches('"').to_string())
        .filter(|line| !line.is_empty())
}

fn kwin_supports_method(method_name: &str) -> bool {
    call_qdbus(&[KWIN_SERVICE, "/KWin"])
        .map(|output| output.lines().any(|line| line.contains(method_name)))
        .unwrap_or(false)
}

struct KdeScriptHandle {
    path: String,
    script_path: PathBuf,
}
