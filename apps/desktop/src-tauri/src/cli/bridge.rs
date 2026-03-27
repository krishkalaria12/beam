use std::collections::VecDeque;
use std::io::Read;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use crossbeam_channel::{bounded, Sender};
use parking_lot::Mutex;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{command, AppHandle, Emitter, Manager};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::cli::config::CONFIG as CLI_CONFIG;
use crate::cli::dmenu::{rank_rows, DmenuOptions, DmenuRequest, DmenuResponse};
use crate::cli::error::{CliError, Result};

pub struct CliBridgeRuntime {
    ui_ready: AtomicBool,
    state: Mutex<CliBridgeQueueState>,
}

struct CliBridgeQueueState {
    queue: VecDeque<PendingDmenuRequest>,
    active_request: Option<DmenuRequest>,
    active_options: Option<DmenuOptions>,
    active_responder: Option<Sender<DmenuResponse>>,
}

struct PendingDmenuRequest {
    request: DmenuRequest,
    options: DmenuOptions,
    responder: Sender<DmenuResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliBridgeHealth {
    pub ok: bool,
    pub ui_ready: bool,
}

static CLI_BRIDGE_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

impl CliBridgeRuntime {
    pub fn new() -> Self {
        Self {
            ui_ready: AtomicBool::new(false),
            state: Mutex::new(CliBridgeQueueState {
                queue: VecDeque::new(),
                active_request: None,
                active_options: None,
                active_responder: None,
            }),
        }
    }

    pub fn mark_ui_ready(&self) {
        self.ui_ready.store(true, Ordering::Release);
    }

    pub fn ui_ready(&self) -> bool {
        self.ui_ready.load(Ordering::Acquire)
    }

    pub fn enqueue_request(
        &self,
        app: &AppHandle,
        request: DmenuRequest,
        options: DmenuOptions,
    ) -> Result<DmenuResponse> {
        let restore_window_hidden = app
            .get_webview_window("main")
            .and_then(|window| window.is_visible().ok())
            .map(|visible| !visible)
            .unwrap_or(false);
        let (tx, rx) = bounded::<DmenuResponse>(1);
        {
            let mut state = self.state.lock();
            let mut request = request;
            request.restore_window_hidden = restore_window_hidden;
            state.queue.push_back(PendingDmenuRequest {
                request,
                options,
                responder: tx,
            });
        }
        self.dispatch_next_request(app);
        rx.recv().map_err(|_| CliError::RequestChannelClosed)
    }

    pub fn complete_request(&self, app: &AppHandle, response: DmenuResponse) -> Result<()> {
        let responder = {
            let mut state = self.state.lock();
            let Some(active_request) = state.active_request.as_ref() else {
                return Err(CliError::NoActiveDmenuRequest);
            };
            if active_request.request_id != response.request_id {
                return Err(CliError::ActiveRequestMismatch {
                    expected: active_request.request_id.clone(),
                    got: response.request_id.clone(),
                });
            }

            state.active_request = None;
            state.active_options = None;
            state.active_responder.take()
        };

        if let Some(responder) = responder {
            responder
                .send(response)
                .map_err(|_| CliError::ResponseChannelSendFailed)?;
        }

        self.dispatch_next_request(app);
        Ok(())
    }

    pub fn search_request(&self, request_id: &str, query: &str) -> Result<Vec<String>> {
        let state = self.state.lock();
        let Some(active_request) = state.active_request.as_ref() else {
            return Err(CliError::NoActiveDmenuRequest);
        };
        let Some(active_options) = state.active_options.as_ref() else {
            return Err(CliError::NoActiveDmenuRequestOptions);
        };
        if active_request.request_id != request_id {
            return Err(CliError::ActiveRequestNotFound {
                request_id: request_id.to_string(),
            });
        }

        Ok(rank_rows(&active_request.rows, active_options, query))
    }

    fn dispatch_next_request(&self, app: &AppHandle) {
        let next_request = {
            let mut state = self.state.lock();
            if state.active_request.is_some() {
                return;
            }

            let Some(next) = state.queue.pop_front() else {
                return;
            };

            state.active_request = Some(next.request.clone());
            state.active_options = Some(next.options);
            state.active_responder = Some(next.responder);
            next.request
        };

        show_launcher_window(app);
        let _ = app.emit(CLI_CONFIG.dmenu_request_event, &next_request);
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.emit(CLI_CONFIG.dmenu_request_event, next_request);
        }
    }
}

fn show_launcher_window(app: &AppHandle) {
    let _ = crate::launcher_window::reveal_launcher_window(app);
}

fn cli_bridge_address() -> String {
    format!("{}:{}", CLI_CONFIG.bridge_host, CLI_CONFIG.bridge_port)
}

fn cli_bridge_base_url() -> String {
    format!("http://{}", cli_bridge_address())
}

fn json_header(name: &[u8], value: &[u8]) -> Header {
    Header::from_bytes(name, value).expect("valid static header")
}

fn send_json_response(request: Request, status: u16, body: Value) {
    let mut response = Response::from_string(body.to_string())
        .with_status_code(StatusCode(status))
        .with_header(json_header(
            b"Content-Type",
            b"application/json; charset=utf-8",
        ));
    response.add_header(json_header(b"Access-Control-Allow-Origin", b"*"));
    response.add_header(json_header(
        b"Access-Control-Allow-Methods",
        b"GET, POST, OPTIONS",
    ));
    response.add_header(json_header(
        b"Access-Control-Allow-Headers",
        b"Content-Type",
    ));
    response.add_header(json_header(b"Cache-Control", b"no-store"));
    let _ = request.respond(response);
}

fn send_empty_response(request: Request, status: u16) {
    let mut response = Response::empty(StatusCode(status));
    response.add_header(json_header(b"Access-Control-Allow-Origin", b"*"));
    response.add_header(json_header(
        b"Access-Control-Allow-Methods",
        b"GET, POST, OPTIONS",
    ));
    response.add_header(json_header(
        b"Access-Control-Allow-Headers",
        b"Content-Type",
    ));
    let _ = request.respond(response);
}

fn parse_json_body<T: DeserializeOwned>(request: &mut Request) -> std::result::Result<T, String> {
    let mut buffer = Vec::new();
    request
        .as_reader()
        .take(2 * 1024 * 1024)
        .read_to_end(&mut buffer)
        .map_err(|error| format!("failed to read request body: {error}"))?;

    if buffer.is_empty() {
        return Err("request body is empty".to_string());
    }

    serde_json::from_slice::<T>(&buffer).map_err(|error| format!("invalid json payload: {error}"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DmenuBridgeSubmission {
    request: DmenuRequest,
    options: DmenuOptions,
}

fn handle_bridge_http_request(app: AppHandle, mut request: Request) {
    let method = request.method().clone();
    let path = request
        .url()
        .split('?')
        .next()
        .unwrap_or("/")
        .trim_end_matches('/');

    if method == Method::Options {
        send_empty_response(request, 204);
        return;
    }

    let cli_bridge = app.state::<crate::state::AppState>().cli_bridge.clone();

    match (method, path) {
        (Method::Get, "/cli/health") => {
            send_json_response(
                request,
                200,
                json!(CliBridgeHealth {
                    ok: true,
                    ui_ready: cli_bridge.ui_ready(),
                }),
            );
        }
        (Method::Post, "/cli/dmenu") => {
            match parse_json_body::<DmenuBridgeSubmission>(&mut request) {
                Ok(payload) => {
                    match cli_bridge.enqueue_request(&app, payload.request, payload.options) {
                        Ok(response) => send_json_response(request, 200, json!(response)),
                        Err(error) => send_json_response(
                            request,
                            500,
                            json!({ "ok": false, "error": error.to_string() }),
                        ),
                    }
                }
                Err(error) => {
                    send_json_response(request, 400, json!({ "ok": false, "error": error }));
                }
            }
        }
        _ => {
            send_json_response(
                request,
                404,
                json!({
                    "ok": false,
                    "error": "route not found",
                }),
            );
        }
    }
}

fn run_cli_bridge_server(app: AppHandle) -> Result<()> {
    let address = cli_bridge_address();
    let server = Server::http(address.clone()).map_err(|error| CliError::CliBridgeServerStart {
        address,
        details: error.to_string(),
    })?;

    for request in server.incoming_requests() {
        handle_bridge_http_request(app.clone(), request);
    }

    Ok(())
}

pub fn start_cli_bridge_server(app: &AppHandle) {
    if CLI_BRIDGE_SERVER_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    let app_handle = app.clone();
    std::thread::spawn(move || {
        if let Err(error) = run_cli_bridge_server(app_handle) {
            log::error!("[cli-bridge] {error}");
            CLI_BRIDGE_SERVER_RUNNING.store(false, Ordering::Release);
        }
    });
}

#[command]
pub fn cli_bridge_mark_ui_ready(app: AppHandle) -> std::result::Result<(), String> {
    app.state::<crate::state::AppState>()
        .cli_bridge
        .mark_ui_ready();
    Ok(())
}

#[command]
pub fn cli_bridge_complete_request(
    app: AppHandle,
    response: DmenuResponse,
) -> std::result::Result<(), String> {
    app.state::<crate::state::AppState>()
        .cli_bridge
        .complete_request(&app, response)
        .map_err(|error| error.to_string())
}

#[command]
pub fn cli_bridge_search_request(
    app: AppHandle,
    request_id: String,
    query: String,
) -> std::result::Result<Vec<String>, String> {
    app.state::<crate::state::AppState>()
        .cli_bridge
        .search_request(&request_id, &query)
        .map_err(|error| error.to_string())
}

async fn fetch_bridge_health(client: &reqwest::Client) -> Result<CliBridgeHealth> {
    let response = client
        .get(format!("{}/cli/health", cli_bridge_base_url()))
        .send()
        .await
        .map_err(|source| CliError::CliBridgeHealthRequest { source })?;
    let response = response
        .error_for_status()
        .map_err(|source| CliError::CliBridgeHealthStatus { source })?;
    response
        .json::<CliBridgeHealth>()
        .await
        .map_err(|source| CliError::CliBridgeHealthDecode { source })
}

async fn post_dmenu_request(
    client: &reqwest::Client,
    request: &DmenuRequest,
    options: &DmenuOptions,
) -> Result<DmenuResponse> {
    let response = client
        .post(format!("{}/cli/dmenu", cli_bridge_base_url()))
        .json(&json!({
            "request": request,
            "options": options,
        }))
        .send()
        .await
        .map_err(|source| CliError::CliBridgeSubmitRequest { source })?;
    let response = response
        .error_for_status()
        .map_err(|source| CliError::CliBridgeSubmitStatus { source })?;
    response
        .json::<DmenuResponse>()
        .await
        .map_err(|source| CliError::CliBridgeSubmitDecode { source })
}

fn spawn_background_app() -> Result<()> {
    let current_exe =
        std::env::current_exe().map_err(|source| CliError::CurrentExecutable { source })?;
    Command::new(current_exe)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|source| CliError::SpawnBackgroundApp { source })?;
    Ok(())
}

pub fn submit_dmenu_request(
    request: &DmenuRequest,
    options: &DmenuOptions,
) -> Result<DmenuResponse> {
    let runtime =
        tokio::runtime::Runtime::new().map_err(|source| CliError::RuntimeCreation { source })?;
    runtime.block_on(async {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(|source| CliError::CliHttpClientBuild { source })?;

        let mut spawned_background_app = false;
        for attempt in 0..40usize {
            match fetch_bridge_health(&client).await {
                Ok(health) if health.ui_ready => {
                    return post_dmenu_request(&client, request, options).await;
                }
                Ok(_) => {}
                Err(_) if !spawned_background_app => {
                    spawn_background_app()?;
                    spawned_background_app = true;
                }
                Err(_) => {}
            }

            if attempt == 39 {
                break;
            }

            tokio::time::sleep(Duration::from_millis(200)).await;
        }

        Err(CliError::CliBridgeTimeout)
    })
}
