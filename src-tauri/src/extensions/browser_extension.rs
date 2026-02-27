use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;
use parking_lot::RwLock;
use scraper::{Html, Selector};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use super::error::{ExtensionsError, Result};
use crate::config::config;

static BRIDGE_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static BRIDGE_STATE: Lazy<RwLock<BrowserBridgeState>> =
    Lazy::new(|| RwLock::new(BrowserBridgeState::default()));

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeTabInput {
    tab_id: u64,
    url: String,
    title: Option<String>,
    favicon: Option<String>,
    active: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeTabContentInput {
    tab_id: u64,
    text: Option<String>,
    html: Option<String>,
    markdown: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeConnectPayload {
    client_id: String,
    browser: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeTabsPayload {
    client_id: String,
    browser: Option<String>,
    tabs: Vec<BridgeTabInput>,
    contents: Option<Vec<BridgeTabContentInput>>,
    active_content: Option<BridgeTabContentInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BridgeTabOutput {
    tab_id: u64,
    url: String,
    title: Option<String>,
    favicon: Option<String>,
    active: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetTabParams {
    field: Option<String>,
    selector: Option<String>,
    tab_id: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TabByIdParams {
    tab_id: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchTabsParams {
    query: Option<String>,
}

#[derive(Debug, Clone, Default)]
struct BridgeTabContent {
    text: String,
    html: String,
    markdown: String,
}

#[derive(Debug, Clone, Default)]
struct BrowserBridgeClientState {
    browser: Option<String>,
    tabs: Vec<BridgeTabInput>,
    contents_by_tab_id: HashMap<u64, BridgeTabContent>,
    last_seen: Option<Instant>,
}

#[derive(Debug, Clone, Default)]
struct BrowserBridgeState {
    clients: HashMap<String, BrowserBridgeClientState>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ContentField {
    Text,
    Html,
    Markdown,
}

fn bridge_address() -> String {
    format!(
        "{}:{}",
        config().EXTENSIONS_BROWSER_BRIDGE_HOST,
        config().EXTENSIONS_BROWSER_BRIDGE_PORT
    )
}

fn get_global_tab_id(client_id: &str, source_tab_id: u64) -> u64 {
    let mut hasher = DefaultHasher::new();
    client_id.hash(&mut hasher);
    source_tab_id.hash(&mut hasher);
    hasher.finish()
}

fn normalize_content_field(field: Option<&str>) -> Option<ContentField> {
    match field.unwrap_or("markdown") {
        "text" => Some(ContentField::Text),
        "html" => Some(ContentField::Html),
        "markdown" => Some(ContentField::Markdown),
        _ => None,
    }
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_string();
    }
    value.chars().take(max_chars).collect()
}

fn is_client_fresh(last_seen: Option<Instant>, now: Instant) -> bool {
    last_seen
        .map(|seen| {
            now.saturating_duration_since(seen)
                <= Duration::from_secs(config().EXTENSIONS_BROWSER_BRIDGE_STALE_SECONDS)
        })
        .unwrap_or(false)
}

fn prune_stale_clients(state: &mut BrowserBridgeState, now: Instant) {
    state
        .clients
        .retain(|_, client| is_client_fresh(client.last_seen, now));
}

fn set_client_connected(payload: BridgeConnectPayload) {
    let mut state = BRIDGE_STATE.write();
    let now = Instant::now();
    prune_stale_clients(&mut state, now);

    let entry = state.clients.entry(payload.client_id).or_default();
    entry.browser = payload.browser.map(|name| name.trim().to_string());
    entry.last_seen = Some(now);
}

fn to_bridge_content(payload: BridgeTabContentInput) -> BridgeTabContent {
    let text = payload.text.unwrap_or_default();
    let html = payload.html.unwrap_or_default();
    let markdown = payload.markdown.unwrap_or_else(|| text.clone());
    let max_chars = config().EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS;

    BridgeTabContent {
        text: truncate_chars(text.trim(), max_chars),
        html: truncate_chars(html.trim(), max_chars),
        markdown: truncate_chars(markdown.trim(), max_chars),
    }
}

fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn extract_content_with_selector(
    content: &BridgeTabContent,
    selector_query: &str,
    field: ContentField,
) -> Option<String> {
    let html = content.html.trim();
    if html.is_empty() {
        return None;
    }

    let selector = Selector::parse(selector_query).ok()?;
    let document = Html::parse_document(html);
    let mut fragments = Vec::new();

    for element in document.select(&selector) {
        let value = match field {
            ContentField::Html => element.inner_html(),
            ContentField::Text | ContentField::Markdown => {
                normalize_whitespace(&element.text().collect::<Vec<_>>().join(" "))
            }
        };

        let value = value.trim();
        if !value.is_empty() {
            fragments.push(value.to_string());
        }
    }

    if fragments.is_empty() {
        return None;
    }

    let combined = fragments.join("\n\n");
    Some(truncate_chars(
        combined.trim(),
        config().EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS,
    ))
}

fn get_content_value(
    content: &BridgeTabContent,
    field: ContentField,
    selector: Option<&str>,
) -> Option<String> {
    let selector = selector.map(str::trim).filter(|value| !value.is_empty());

    if let Some(selector_query) = selector {
        return extract_content_with_selector(content, selector_query, field);
    }

    let value = match field {
        ContentField::Text => &content.text,
        ContentField::Html => &content.html,
        ContentField::Markdown => &content.markdown,
    };

    if value.is_empty() {
        return None;
    }

    Some(value.clone())
}

fn upsert_tabs(payload: BridgeTabsPayload) {
    let mut state = BRIDGE_STATE.write();
    let now = Instant::now();
    prune_stale_clients(&mut state, now);

    let current_tab_ids: std::collections::HashSet<u64> =
        payload.tabs.iter().map(|tab| tab.tab_id).collect();

    let client = state.clients.entry(payload.client_id).or_default();
    client.browser = payload.browser.map(|name| name.trim().to_string());
    client.last_seen = Some(now);
    client.tabs = payload
        .tabs
        .into_iter()
        .filter(|tab| !tab.url.trim().is_empty())
        .collect();
    client
        .contents_by_tab_id
        .retain(|tab_id, _| current_tab_ids.contains(tab_id));

    if let Some(contents) = payload.contents {
        for content in contents {
            client
                .contents_by_tab_id
                .insert(content.tab_id, to_bridge_content(content));
        }
    }

    if let Some(active_content) = payload.active_content {
        client
            .contents_by_tab_id
            .insert(active_content.tab_id, to_bridge_content(active_content));
    }
}

fn has_bridge_connection() -> bool {
    let mut state = BRIDGE_STATE.write();
    let now = Instant::now();
    prune_stale_clients(&mut state, now);
    !state.clients.is_empty()
}

fn get_tabs_snapshot() -> Vec<BridgeTabOutput> {
    let mut state = BRIDGE_STATE.write();
    let now = Instant::now();
    prune_stale_clients(&mut state, now);

    let mut tabs = Vec::new();
    for (client_id, client) in &state.clients {
        for tab in &client.tabs {
            tabs.push(BridgeTabOutput {
                tab_id: get_global_tab_id(client_id, tab.tab_id),
                url: tab.url.clone(),
                title: tab.title.clone(),
                favicon: tab.favicon.clone(),
                active: tab.active,
            });
        }
    }

    tabs.sort_by(|left, right| right.active.cmp(&left.active));
    tabs
}

fn get_active_tab_snapshot() -> Option<BridgeTabOutput> {
    let tabs = get_tabs_snapshot();
    if let Some(active) = tabs.iter().find(|tab| tab.active) {
        return Some(active.clone());
    }
    tabs.first().cloned()
}

fn get_tab_by_id_snapshot(tab_id: u64) -> Option<BridgeTabOutput> {
    get_tabs_snapshot()
        .into_iter()
        .find(|tab| tab.tab_id == tab_id)
}

fn search_tabs_snapshot(query: &str) -> Vec<BridgeTabOutput> {
    let normalized_query = query.trim().to_lowercase();
    if normalized_query.is_empty() {
        return get_tabs_snapshot();
    }

    get_tabs_snapshot()
        .into_iter()
        .filter(|tab| {
            tab.url.to_lowercase().contains(&normalized_query)
                || tab
                    .title
                    .as_ref()
                    .map(|title| title.to_lowercase().contains(&normalized_query))
                    .unwrap_or(false)
        })
        .collect()
}

fn get_content_from_bridge(tab_id: Option<u64>, field: ContentField, selector: Option<&str>) -> Option<String> {
    let mut state = BRIDGE_STATE.write();
    let now = Instant::now();
    prune_stale_clients(&mut state, now);

    if let Some(global_tab_id) = tab_id {
        for (client_id, client) in &state.clients {
            for tab in &client.tabs {
                if get_global_tab_id(client_id, tab.tab_id) != global_tab_id {
                    continue;
                }

                let Some(content) = client.contents_by_tab_id.get(&tab.tab_id) else {
                    continue;
                };
                if let Some(value) = get_content_value(content, field, selector) {
                    return Some(value);
                }
            }
        }
    }

    for client in state.clients.values() {
        let Some(active_tab) = client.tabs.iter().find(|tab| tab.active) else {
            continue;
        };
        let Some(content) = client.contents_by_tab_id.get(&active_tab.tab_id) else {
            continue;
        };
        if let Some(value) = get_content_value(content, field, selector) {
            return Some(value);
        }
    }

    None
}

fn json_header(name: &[u8], value: &[u8]) -> Header {
    Header::from_bytes(name, value).expect("valid static header")
}

fn send_json_response(request: Request, status: u16, body: Value) {
    let mut response = Response::from_string(body.to_string())
        .with_status_code(StatusCode(status))
        .with_header(json_header(b"Content-Type", b"application/json; charset=utf-8"));
    response.add_header(json_header(b"Access-Control-Allow-Origin", b"*"));
    response.add_header(json_header(
        b"Access-Control-Allow-Methods",
        b"GET, POST, OPTIONS",
    ));
    response.add_header(json_header(b"Access-Control-Allow-Headers", b"Content-Type"));
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
    response.add_header(json_header(b"Access-Control-Allow-Headers", b"Content-Type"));
    let _ = request.respond(response);
}

fn parse_json_body<T: DeserializeOwned>(request: &mut Request) -> std::result::Result<T, String> {
    let mut buffer = Vec::new();
    request
        .as_reader()
        .take(config().EXTENSIONS_BROWSER_BRIDGE_MAX_BODY_BYTES as u64)
        .read_to_end(&mut buffer)
        .map_err(|error| format!("failed to read request body: {error}"))?;

    if buffer.is_empty() {
        return Err("request body is empty".to_string());
    }

    serde_json::from_slice::<T>(&buffer).map_err(|error| format!("invalid json payload: {error}"))
}

fn handle_bridge_http_request(mut request: Request) {
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

    match (method, path) {
        (Method::Get, "/bridge/health") => {
            send_json_response(
                request,
                200,
                json!({
                    "ok": true,
                    "host": config().EXTENSIONS_BROWSER_BRIDGE_HOST,
                    "port": config().EXTENSIONS_BROWSER_BRIDGE_PORT,
                    "connected": has_bridge_connection(),
                }),
            );
        }
        (Method::Post, "/bridge/connect") => match parse_json_body::<BridgeConnectPayload>(&mut request) {
            Ok(payload) => {
                set_client_connected(payload);
                send_json_response(request, 200, json!({ "ok": true }));
            }
            Err(error) => {
                send_json_response(request, 400, json!({ "ok": false, "error": error }));
            }
        },
        (Method::Post, "/bridge/tabs") => match parse_json_body::<BridgeTabsPayload>(&mut request) {
            Ok(payload) => {
                upsert_tabs(payload);
                send_json_response(request, 200, json!({ "ok": true }));
            }
            Err(error) => {
                send_json_response(request, 400, json!({ "ok": false, "error": error }));
            }
        },
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

fn run_bridge_server() -> std::result::Result<(), String> {
    let server = Server::http(bridge_address())
        .map_err(|error| format!("failed to start browser bridge server: {error}"))?;

    for request in server.incoming_requests() {
        handle_bridge_http_request(request);
    }

    Ok(())
}

pub fn start_bridge_server(_app: &tauri::AppHandle) {
    if BRIDGE_SERVER_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    std::thread::spawn(|| {
        if let Err(error) = run_bridge_server() {
            log::error!("[browser-extension] {error}");
            BRIDGE_SERVER_RUNNING.store(false, Ordering::Release);
        }
    });
}

#[tauri::command]
pub async fn browser_extension_check_connection() -> Result<bool> {
    Ok(has_bridge_connection())
}

#[tauri::command]
pub async fn browser_extension_request(method: String, params: Value) -> Result<Value> {
    match method.as_str() {
        "getTabs" => {
            if !has_bridge_connection() {
                return Err(ExtensionsError::BrowserExtensionUnavailable(method));
            }
            Ok(json!({ "value": get_tabs_snapshot() }))
        }
        "getActiveTab" => {
            if !has_bridge_connection() {
                return Err(ExtensionsError::BrowserExtensionUnavailable(method));
            }
            Ok(json!({ "value": get_active_tab_snapshot() }))
        }
        "getTabById" => {
            if !has_bridge_connection() {
                return Err(ExtensionsError::BrowserExtensionUnavailable(method));
            }

            let parsed: TabByIdParams = serde_json::from_value(params).unwrap_or(TabByIdParams {
                tab_id: None,
            });
            let Some(tab_id) = parsed.tab_id else {
                return Err(ExtensionsError::Message(
                    "browser extension request requires tabId".to_string(),
                ));
            };

            Ok(json!({ "value": get_tab_by_id_snapshot(tab_id) }))
        }
        "searchTabs" => {
            if !has_bridge_connection() {
                return Err(ExtensionsError::BrowserExtensionUnavailable(method));
            }

            let parsed: SearchTabsParams =
                serde_json::from_value(params).unwrap_or(SearchTabsParams { query: None });
            let query = parsed.query.unwrap_or_default();
            Ok(json!({ "value": search_tabs_snapshot(&query) }))
        }
        "getTab" | "getContent" => {
            let parsed: GetTabParams = serde_json::from_value(params).unwrap_or(GetTabParams {
                field: Some("markdown".to_string()),
                selector: None,
                tab_id: None,
            });

            let Some(field) = normalize_content_field(parsed.field.as_deref()) else {
                return Err(ExtensionsError::Message(
                    "browser extension request field must be one of: text, html, markdown"
                        .to_string(),
                ));
            };

            if !has_bridge_connection() {
                return Err(ExtensionsError::BrowserExtensionUnavailable(method));
            }

            if let Some(value) = get_content_from_bridge(parsed.tab_id, field, parsed.selector.as_deref()) {
                return Ok(json!({ "value": value }));
            }

            Err(ExtensionsError::BrowserExtensionUnavailable(
                "no tab content available from browser bridge".to_string(),
            ))
        }
        _ => Err(ExtensionsError::BrowserExtensionUnavailable(method)),
    }
}
