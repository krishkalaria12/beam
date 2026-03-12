use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStderr, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{mpsc, Arc};
use std::time::Duration;

use flate2::read::ZlibDecoder;
use nanoid::nanoid;
use parking_lot::Mutex;
use prost::Message;
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::extensions::runtime::proto::{
    manager_request, manager_response, AckResponse, CommandMode, ErrorResponse,
    GetPreferencesResponse, LaunchPluginRequest, LaunchType, ManagerRequest, ManagerResponse,
    RuntimeEvent, SetPreferencesResponse,
};

const EXTENSION_RUNTIME_MESSAGE_EVENT: &str = "extension-runtime-message";
const EXTENSION_RUNTIME_STDERR_EVENT: &str = "extension-runtime-stderr";
const EXTENSION_RUNTIME_EXIT_EVENT: &str = "extension-runtime-exit";
const DEFAULT_RUNTIME_ID: &str = "foreground";
const MANAGER_REQUEST_TIMEOUT: Duration = Duration::from_secs(5);

type PendingSender = mpsc::SyncSender<Result<ManagerResponse, String>>;

struct ManagedRuntime {
    child: Child,
    stdin: Arc<Mutex<BufWriter<ChildStdin>>>,
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

fn resolve_sidecar_launcher(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidate_dirs = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidate_dirs.push(resource_dir.join("binaries"));
        candidate_dirs.push(resource_dir);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    candidate_dirs.push(manifest_dir.join("binaries"));
    if let Some(workspace_root) = manifest_dir.parent() {
        candidate_dirs.push(workspace_root.join("src-tauri").join("binaries"));
    }

    for directory in candidate_dirs {
        if let Some(path) = find_sidecar_launcher_in_dir(&directory) {
            return Ok(path);
        }
    }

    Err("failed to locate the extension runtime launcher".to_string())
}

fn find_sidecar_launcher_in_dir(directory: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(directory).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name()?.to_string_lossy();
        if path.is_file() && (name == "app" || name.starts_with("app-")) {
            return Some(path);
        }
    }

    None
}

fn build_sidecar_args(app: &AppHandle) -> Result<Vec<String>, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;
    let cache_dir = app.path().app_cache_dir().map_err(|error| error.to_string())?;

    Ok(vec![
        format!("--data-dir={}", data_dir.display()),
        format!("--cache-dir={}", cache_dir.display()),
    ])
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

fn prost_struct_to_json(value: &prost_types::Struct) -> Value {
    Value::Object(
        value
            .fields
            .iter()
            .map(|(key, value)| (key.clone(), prost_value_to_json(value)))
            .collect(),
    )
}

fn prost_value_to_json(value: &prost_types::Value) -> Value {
    match &value.kind {
        Some(prost_types::value::Kind::NullValue(_)) | None => Value::Null,
        Some(prost_types::value::Kind::NumberValue(number)) => json!(number),
        Some(prost_types::value::Kind::StringValue(text)) => json!(text),
        Some(prost_types::value::Kind::BoolValue(boolean)) => json!(boolean),
        Some(prost_types::value::Kind::StructValue(object)) => prost_struct_to_json(object),
        Some(prost_types::value::Kind::ListValue(list)) => {
            Value::Array(list.values.iter().map(prost_value_to_json).collect())
        }
    }
}

fn json_to_prost_struct(value: &Value) -> Option<prost_types::Struct> {
    let object = value.as_object()?;
    Some(prost_types::Struct {
        fields: object
            .iter()
            .map(|(key, value)| (key.clone(), json_to_prost_value(value)))
            .collect(),
    })
}

fn json_to_prost_value(value: &Value) -> prost_types::Value {
    use prost_types::value::Kind;

    let kind = match value {
        Value::Null => Kind::NullValue(prost_types::NullValue::NullValue as i32),
        Value::Bool(boolean) => Kind::BoolValue(*boolean),
        Value::Number(number) => Kind::NumberValue(number.as_f64().unwrap_or_default()),
        Value::String(text) => Kind::StringValue(text.clone()),
        Value::Array(items) => Kind::ListValue(prost_types::ListValue {
            values: items.iter().map(json_to_prost_value).collect(),
        }),
        Value::Object(_) => Kind::StructValue(json_to_prost_struct(value).unwrap_or_default()),
    };

    prost_types::Value { kind: Some(kind) }
}

fn manager_request_to_wire_message(request: &ManagerRequest) -> Result<Value, String> {
    let mut payload = Map::new();
    payload.insert("requestId".to_string(), json!(request.request_id));

    match request.request.as_ref() {
        Some(manager_request::Request::Ping(_)) => {
            payload.insert("ping".to_string(), json!({}));
        }
        Some(manager_request::Request::LaunchPlugin(launch)) => {
            payload.insert("launchPlugin".to_string(), launch_plugin_request_to_json(launch));
        }
        Some(manager_request::Request::GetPreferences(value)) => {
            payload.insert(
                "getPreferences".to_string(),
                json!({
                    "extensionId": value.extension_id,
                }),
            );
        }
        Some(manager_request::Request::SetPreferences(value)) => {
            let mut inner = Map::new();
            inner.insert("extensionId".to_string(), json!(value.extension_id));
            if let Some(values) = &value.values {
                inner.insert("values".to_string(), prost_struct_to_json(values));
            }
            payload.insert("setPreferences".to_string(), Value::Object(inner));
        }
        Some(manager_request::Request::DispatchViewEvent(value)) => {
            payload.insert(
                "dispatchViewEvent".to_string(),
                json!({
                    "instanceId": value.instance_id,
                    "handlerName": value.handler_name,
                    "args": value.args.iter().map(prost_value_to_json).collect::<Vec<_>>(),
                }),
            );
        }
        Some(manager_request::Request::RuntimeEvent(value)) => {
            payload.insert("runtimeEvent".to_string(), runtime_event_to_json(value));
        }
        Some(manager_request::Request::DispatchToastAction(value)) => {
            payload.insert(
                "dispatchToastAction".to_string(),
                json!({
                    "toastId": value.toast_id,
                    "actionType": value.action_type,
                }),
            );
        }
        Some(manager_request::Request::TriggerToastHide(value)) => {
            payload.insert(
                "triggerToastHide".to_string(),
                json!({
                    "toastId": value.toast_id,
                }),
            );
        }
        Some(manager_request::Request::SetBrowserExtensionConnectionStatus(value)) => {
            payload.insert(
                "setBrowserExtensionConnectionStatus".to_string(),
                json!({
                    "isConnected": value.is_connected,
                }),
            );
        }
        None => return Err("manager request payload is missing".to_string()),
    }

    Ok(json!({
        "action": "manager-request",
        "payload": payload,
    }))
}

fn launch_plugin_request_to_json(value: &LaunchPluginRequest) -> Value {
    let mut inner = Map::new();
    inner.insert("pluginPath".to_string(), json!(value.plugin_path));
    inner.insert(
        "mode".to_string(),
        json!(
            CommandMode::try_from(value.mode)
                .unwrap_or(CommandMode::Unspecified)
                .as_str_name()
        ),
    );
    inner.insert("aiAccess".to_string(), json!(value.ai_access));
    if let Some(arguments) = &value.launch_arguments {
        inner.insert("launchArguments".to_string(), prost_struct_to_json(arguments));
    }
    if let Some(context) = &value.launch_context {
        inner.insert("launchContext".to_string(), prost_struct_to_json(context));
    }
    inner.insert(
        "launchType".to_string(),
        json!(
            LaunchType::try_from(value.launch_type)
                .unwrap_or(LaunchType::Unspecified)
                .as_str_name()
        ),
    );
    if !value.command_name.is_empty() {
        inner.insert("commandName".to_string(), json!(value.command_name));
    }
    if !value.fallback_text.is_empty() {
        inner.insert("fallbackText".to_string(), json!(value.fallback_text));
    }

    Value::Object(inner)
}

fn runtime_event_to_json(value: &RuntimeEvent) -> Value {
    let mut inner = Map::new();

    match value.event.as_ref() {
        Some(crate::extensions::runtime::proto::runtime_event::Event::Shutdown(_)) => {
            inner.insert("shutdown".to_string(), json!({}));
        }
        Some(crate::extensions::runtime::proto::runtime_event::Event::PopView(_)) => {
            inner.insert("popView".to_string(), json!({}));
        }
        Some(crate::extensions::runtime::proto::runtime_event::Event::PreferencesChanged(event)) => {
            let mut payload = Map::new();
            if let Some(values) = &event.values {
                payload.insert("values".to_string(), prost_struct_to_json(values));
            }
            inner.insert("preferencesChanged".to_string(), Value::Object(payload));
        }
        None => {}
    }

    Value::Object(inner)
}

fn parse_manager_response_message(raw: &Value) -> Option<Result<ManagerResponse, String>> {
    let record = raw.as_object()?;
    if record.get("type")?.as_str()? != "manager-response" {
        return None;
    }

    Some(json_to_manager_response(record.get("payload")?))
}

fn json_to_manager_response(value: &Value) -> Result<ManagerResponse, String> {
    let object = value
        .as_object()
        .ok_or_else(|| "manager response payload must be an object".to_string())?;
    let request_id = object
        .get("requestId")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    let response = if let Some(ping) = object.get("ping") {
        manager_response::Response::Ping(crate::extensions::runtime::proto::PingResponse {
            ok: ping
                .as_object()
                .and_then(|entry| entry.get("ok"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })
    } else if let Some(ack) = object.get("ack") {
        manager_response::Response::Ack(AckResponse {
            ok: ack
                .as_object()
                .and_then(|entry| entry.get("ok"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })
    } else if let Some(error) = object.get("error") {
        manager_response::Response::Error(ErrorResponse {
            message: error
                .as_object()
                .and_then(|entry| entry.get("message"))
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
        })
    } else if let Some(get_preferences) = object.get("getPreferences") {
        let get_preferences_object = get_preferences
            .as_object()
            .ok_or_else(|| "invalid getPreferences response".to_string())?;
        manager_response::Response::GetPreferences(GetPreferencesResponse {
            extension_id: get_preferences_object
                .get("extensionId")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            values: get_preferences_object
                .get("values")
                .and_then(json_to_prost_struct),
        })
    } else if let Some(set_preferences) = object.get("setPreferences") {
        let set_preferences_object = set_preferences
            .as_object()
            .ok_or_else(|| "invalid setPreferences response".to_string())?;
        manager_response::Response::SetPreferences(SetPreferencesResponse {
            extension_id: set_preferences_object
                .get("extensionId")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            ok: set_preferences_object
                .get("ok")
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })
    } else {
        return Err("unsupported manager response payload".to_string());
    };

    Ok(ManagerResponse {
        request_id,
        response: Some(response),
    })
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

            let decoded_value: Value = match rmp_serde::from_slice(&decoded_payload) {
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
                    Ok(response) => {
                        let sender = pending_requests
                            .lock()
                            .get_mut(&runtime_id)
                            .and_then(|requests| requests.remove(&response.request_id));
                        if let Some(sender) = sender {
                            let _ = sender.send(Ok(response));
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
            match managed.child.try_wait().map_err(|error| error.to_string())? {
                None => return Ok(()),
                Some(_) => true,
            }
        } else {
            false
        };

        if runtime_exited {
            runtimes.remove(runtime_id);
        }

        let launcher = resolve_sidecar_launcher(app)?;
        let args = build_sidecar_args(app)?;
        let mut child = Command::new(launcher)
            .args(args)
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
            "action": action,
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
    let mut request = ManagerRequest::decode(request.as_slice()).map_err(|error| error.to_string())?;
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

    let mut encoded = Vec::new();
    response.encode(&mut encoded).map_err(|error| error.to_string())?;
    Ok(encoded)
}
