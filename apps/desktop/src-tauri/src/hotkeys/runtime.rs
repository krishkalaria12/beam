#[cfg(target_os = "linux")]
use std::collections::HashMap;
use std::env;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

#[cfg(target_os = "linux")]
use ashpd::desktop::global_shortcuts::{GlobalShortcuts, NewShortcut};
#[cfg(target_os = "linux")]
use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
#[cfg(target_os = "linux")]
use tokio::sync::watch;

use super::models::{HotkeyCapabilities, HotkeySettings};
#[cfg(target_os = "linux")]
use super::shortcuts::{build_compositor_bindings, format_portal_preferred_trigger};
use super::store::{open_store, read_hotkey_settings};
use crate::custom_config;
use crate::hotkeys::config::CONFIG as HOTKEYS_CONFIG;

#[derive(Debug, Clone, Serialize)]
struct HotkeyCommandEventPayload {
    command_id: String,
    source: String,
}

#[derive(Debug, Clone, Serialize)]
struct HotkeyBackendStatusEventPayload {
    level: String,
    message: String,
    hint: Option<String>,
    source: String,
}

#[derive(Debug, Clone)]
struct HotkeyRuntimeSnapshot {
    portal_supported: bool,
    portal_active: bool,
    last_error: Option<String>,
}

impl Default for HotkeyRuntimeSnapshot {
    fn default() -> Self {
        Self {
            portal_supported: false,
            portal_active: false,
            last_error: None,
        }
    }
}

#[cfg(target_os = "linux")]
#[derive(Debug, Clone)]
enum PortalShortcutTarget {
    ToggleLauncher,
    Command(String),
}

static HOTKEY_RUNTIME_SNAPSHOT: OnceLock<Mutex<HotkeyRuntimeSnapshot>> = OnceLock::new();
static HOTKEY_RUNTIME_LAST_STATUS_KEY: OnceLock<Mutex<Option<String>>> = OnceLock::new();
#[cfg(target_os = "linux")]
static HOTKEY_RUNTIME_RELOAD: OnceLock<watch::Sender<u64>> = OnceLock::new();
static LAST_TOGGLE: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();

pub fn initialize_hotkey_backend(app: &AppHandle) {
    {
        let mut snapshot = lock_runtime_snapshot();
        snapshot.portal_supported = false;
        snapshot.portal_active = false;
        snapshot.last_error = None;
    }

    #[cfg(target_os = "linux")]
    {
        if detect_session_type() != "wayland" {
            set_runtime_fallback(
                app,
                HOTKEYS_CONFIG.wayland_disabled_message.to_string(),
                false,
                None,
                false,
            );
            return;
        }

        if HOTKEY_RUNTIME_RELOAD.get().is_some() {
            return;
        }

        let (reload_tx, reload_rx) = watch::channel(0_u64);
        if HOTKEY_RUNTIME_RELOAD.set(reload_tx).is_err() {
            return;
        }

        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            run_linux_wayland_hotkey_runtime(app_handle, reload_rx).await;
        });
    }

    #[cfg(not(target_os = "linux"))]
    let _ = app;
}

pub fn toggle_launcher(app: &AppHandle) {
    if !should_toggle_now() {
        return;
    }

    let Some(main_window) = app.get_webview_window("main") else {
        return;
    };

    let is_visible = main_window.is_visible().unwrap_or(false);
    let is_focused = main_window.is_focused().unwrap_or(false);

    if is_visible && is_focused {
        let _ = main_window.hide();
        return;
    }

    let _ = crate::launcher_window::reveal_launcher_window(app);
}

pub fn dispatch_hotkey_command(app: &AppHandle, command_id: String, source: &'static str) {
    let normalized_command_id = command_id.trim().to_string();
    if normalized_command_id.is_empty() {
        return;
    }

    if custom_config::is_command_hidden(app, &normalized_command_id) {
        emit_hotkey_backend_status_event(
            app,
            "warning",
            format!(
                "Command '{}' is hidden and cannot be run.",
                normalized_command_id
            ),
            None,
            source,
        );
        return;
    }

    show_launcher_window(app);
    emit_hotkey_command_event(app, normalized_command_id, source.to_string());
}

pub fn dispatch_hotkey_command_startup(app: &AppHandle, command_id: String) {
    let normalized_command_id = command_id.trim().to_string();
    if normalized_command_id.is_empty() {
        return;
    }

    if custom_config::is_command_hidden(app, &normalized_command_id) {
        emit_hotkey_backend_status_event(
            app,
            "warning",
            format!(
                "Command '{}' is hidden and cannot be run.",
                normalized_command_id
            ),
            None,
            "startup-cli",
        );
        return;
    }

    show_launcher_window(app);
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(220)).await;
        emit_hotkey_command_event(
            &app_handle,
            normalized_command_id,
            "startup-cli".to_string(),
        );
    });
}

pub(super) fn hotkey_capabilities() -> HotkeyCapabilities {
    let session_type = detect_session_type();
    let compositor = detect_compositor();
    let is_wayland = session_type == "wayland";
    let runtime_snapshot = read_runtime_snapshot();

    if is_wayland {
        if runtime_snapshot.portal_active {
            return HotkeyCapabilities {
                session_type,
                compositor,
                backend: "xdg-global-shortcuts-portal".to_string(),
                global_launcher_supported: true,
                global_command_hotkeys_supported: true,
                launcher_only_supported: true,
                notes: vec![
                    "Global shortcuts are active through XDG desktop portal.".to_string(),
                    "Compositor snippets below are optional fallback bindings.".to_string(),
                ],
            };
        }

        let mut notes = vec![
            "Beam does not use X11 capture and runs Wayland-only global shortcuts.".to_string(),
            "Configure compositor keybinds that call `beam --toggle` and `beam --run-command <id>`."
                .to_string(),
        ];
        if let Some(last_error) = runtime_snapshot.last_error {
            notes.push(format!("Portal backend unavailable: {last_error}"));
        } else if !runtime_snapshot.portal_supported {
            notes.push(
                "XDG GlobalShortcuts portal was not detected for this compositor/session."
                    .to_string(),
            );
        }

        return HotkeyCapabilities {
            session_type,
            compositor,
            backend: "wayland-compositor".to_string(),
            global_launcher_supported: true,
            global_command_hotkeys_supported: true,
            launcher_only_supported: true,
            notes,
        };
    }

    HotkeyCapabilities {
        session_type,
        compositor,
        backend: "launcher-only".to_string(),
        global_launcher_supported: false,
        global_command_hotkeys_supported: false,
        launcher_only_supported: true,
        notes: vec![
            HOTKEYS_CONFIG.wayland_disabled_message.to_string(),
            "Launcher-only shortcuts inside the Beam window still work.".to_string(),
        ],
    }
}

pub(super) fn emit_settings_updated_event(app: &AppHandle) {
    if let Ok(store) = open_store(app) {
        let settings = read_hotkey_settings(&store);
        let _ = app.emit(HOTKEYS_CONFIG.settings_updated_event, settings);
    }
}

#[cfg(target_os = "linux")]
pub(super) fn request_hotkey_runtime_reload() {
    let Some(reload_tx) = HOTKEY_RUNTIME_RELOAD.get() else {
        return;
    };
    let next_value = {
        let current = *reload_tx.borrow();
        current.wrapping_add(1)
    };
    let _ = reload_tx.send(next_value);
}

#[cfg(not(target_os = "linux"))]
pub(super) fn request_hotkey_runtime_reload() {}

fn should_toggle_now() -> bool {
    let now = Instant::now();
    let min_interval = Duration::from_millis(250);
    let lock = LAST_TOGGLE.get_or_init(|| Mutex::new(None));

    if let Ok(mut last) = lock.lock() {
        if let Some(previous) = *last {
            if now.duration_since(previous) < min_interval {
                return false;
            }
        }
        *last = Some(now);
        return true;
    }

    true
}

fn lock_runtime_snapshot() -> std::sync::MutexGuard<'static, HotkeyRuntimeSnapshot> {
    HOTKEY_RUNTIME_SNAPSHOT
        .get_or_init(|| Mutex::new(HotkeyRuntimeSnapshot::default()))
        .lock()
        .expect("hotkey runtime snapshot lock poisoned")
}

fn read_runtime_snapshot() -> HotkeyRuntimeSnapshot {
    lock_runtime_snapshot().clone()
}

fn emit_hotkey_command_event(app: &AppHandle, command_id: String, source: String) {
    let payload = HotkeyCommandEventPayload { command_id, source };

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.emit(HOTKEYS_CONFIG.command_event, payload);
        return;
    }

    let _ = app.emit(HOTKEYS_CONFIG.command_event, payload);
}

fn emit_hotkey_backend_status_event(
    app: &AppHandle,
    level: &'static str,
    message: String,
    hint: Option<String>,
    source: &'static str,
) {
    let dedupe_key = format!(
        "{level}|{source}|{message}|{}",
        hint.as_deref().unwrap_or("")
    );
    let mut last_status = HOTKEY_RUNTIME_LAST_STATUS_KEY
        .get_or_init(|| Mutex::new(None))
        .lock()
        .expect("hotkey runtime status lock poisoned");
    if last_status.as_deref() == Some(dedupe_key.as_str()) {
        return;
    }
    *last_status = Some(dedupe_key);

    let payload = HotkeyBackendStatusEventPayload {
        level: level.to_string(),
        message,
        hint,
        source: source.to_string(),
    };

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.emit(HOTKEYS_CONFIG.backend_status_event, payload.clone());
    }
    let _ = app.emit(HOTKEYS_CONFIG.backend_status_event, payload);
}

fn show_launcher_window(app: &AppHandle) {
    let _ = crate::launcher_window::reveal_launcher_window(app);
}

fn detect_session_type() -> String {
    if let Ok(session) = env::var("XDG_SESSION_TYPE") {
        let normalized = session.trim().to_lowercase();
        if !normalized.is_empty() {
            return normalized;
        }
    }

    if env::var_os("WAYLAND_DISPLAY").is_some() {
        return "wayland".to_string();
    }

    "unknown".to_string()
}

fn detect_compositor() -> String {
    if env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some() {
        return "hyprland".to_string();
    }
    if env::var_os("SWAYSOCK").is_some() {
        return "sway".to_string();
    }

    let desktop = env::var("XDG_CURRENT_DESKTOP")
        .ok()
        .map(|value| value.to_lowercase())
        .unwrap_or_default();

    if desktop.contains("kde") || desktop.contains("plasma") {
        return "kde".to_string();
    }
    if desktop.contains("gnome") {
        return "gnome".to_string();
    }
    if desktop.contains("cosmic") {
        return "cosmic".to_string();
    }

    if desktop.trim().is_empty() {
        return "unknown".to_string();
    }

    desktop
}

#[cfg(target_os = "linux")]
async fn wait_for_reload_or_retry(reload_rx: &mut watch::Receiver<u64>) -> bool {
    let retry_delay = tokio::time::sleep(Duration::from_secs(8));
    tokio::pin!(retry_delay);

    tokio::select! {
        changed = reload_rx.changed() => changed.is_ok(),
        _ = &mut retry_delay => true,
    }
}

#[cfg(target_os = "linux")]
fn build_compositor_binding_hint(settings: &HotkeySettings) -> Option<String> {
    let capabilities = HotkeyCapabilities {
        session_type: "wayland".to_string(),
        compositor: detect_compositor(),
        backend: "wayland-compositor".to_string(),
        global_launcher_supported: true,
        global_command_hotkeys_supported: true,
        launcher_only_supported: true,
        notes: Vec::new(),
    };
    let bindings = build_compositor_bindings(settings, &capabilities);
    bindings.launcher_binding_examples.into_iter().next()
}

#[cfg(target_os = "linux")]
fn set_runtime_fallback(
    app: &AppHandle,
    error: String,
    portal_supported: bool,
    settings: Option<&HotkeySettings>,
    should_notify_user: bool,
) {
    let mut snapshot = lock_runtime_snapshot();
    snapshot.portal_supported = portal_supported;
    snapshot.portal_active = false;
    snapshot.last_error = Some(error.clone());
    drop(snapshot);

    if !should_notify_user {
        return;
    }

    let hint = settings.and_then(build_compositor_binding_hint);
    let message = if hint.is_some() {
        HOTKEYS_CONFIG.wayland_fallback_message.to_string()
    } else {
        format!("{} {error}", HOTKEYS_CONFIG.wayland_fallback_message)
    };

    emit_hotkey_backend_status_event(app, "warning", message, hint, "hotkey-backend");
}

#[cfg(target_os = "linux")]
async fn run_linux_wayland_hotkey_runtime(app: AppHandle, mut reload_rx: watch::Receiver<u64>) {
    loop {
        if detect_session_type() != "wayland" {
            set_runtime_fallback(
                &app,
                HOTKEYS_CONFIG.wayland_disabled_message.to_string(),
                false,
                None,
                false,
            );
            if reload_rx.changed().await.is_err() {
                return;
            }
            continue;
        }

        let settings = match open_store(&app).map(|store| read_hotkey_settings(&store)) {
            Ok(settings) => settings,
            Err(err) => {
                set_runtime_fallback(
                    &app,
                    format!("failed to load hotkey settings: {err}"),
                    false,
                    None,
                    true,
                );
                if !wait_for_reload_or_retry(&mut reload_rx).await {
                    return;
                }
                continue;
            }
        };
        let mut settings = settings;
        settings
            .command_hotkeys
            .retain(|command_id, _| !custom_config::is_command_hidden(&app, command_id));

        if let Ok(app_id) = ashpd::AppID::try_from(app.config().identifier.as_str()) {
            if let Err(err) = ashpd::register_host_app(app_id).await {
                log::debug!("failed to register host app for portal permissions: {err}");
            }
        }

        let proxy = match GlobalShortcuts::new().await {
            Ok(proxy) => proxy,
            Err(err) => {
                let portal_supported = !matches!(err, ashpd::Error::PortalNotFound(_));
                set_runtime_fallback(
                    &app,
                    format!("failed to create portal proxy: {err}"),
                    portal_supported,
                    Some(&settings),
                    true,
                );
                if !wait_for_reload_or_retry(&mut reload_rx).await {
                    return;
                }
                continue;
            }
        };

        let session = match proxy.create_session().await {
            Ok(session) => session,
            Err(err) => {
                let portal_supported = !matches!(err, ashpd::Error::PortalNotFound(_));
                set_runtime_fallback(
                    &app,
                    format!("failed to create portal shortcut session: {err}"),
                    portal_supported,
                    Some(&settings),
                    true,
                );
                if !wait_for_reload_or_retry(&mut reload_rx).await {
                    return;
                }
                continue;
            }
        };

        let (portal_shortcuts, portal_targets) = build_portal_shortcuts(&settings);

        let bind_request = match proxy
            .bind_shortcuts(&session, &portal_shortcuts, None)
            .await
        {
            Ok(request) => request,
            Err(err) => {
                let _ = session.close().await;
                set_runtime_fallback(
                    &app,
                    format!("failed to bind portal shortcuts: {err}"),
                    true,
                    Some(&settings),
                    true,
                );
                if !wait_for_reload_or_retry(&mut reload_rx).await {
                    return;
                }
                continue;
            }
        };

        if let Err(err) = bind_request.response() {
            let _ = session.close().await;
            set_runtime_fallback(
                &app,
                format!("portal denied shortcut registration: {err}"),
                true,
                Some(&settings),
                true,
            );
            if !wait_for_reload_or_retry(&mut reload_rx).await {
                return;
            }
            continue;
        }

        let activated_stream = match proxy.receive_activated().await {
            Ok(stream) => stream,
            Err(err) => {
                let _ = session.close().await;
                set_runtime_fallback(
                    &app,
                    format!("failed to subscribe to portal shortcut events: {err}"),
                    true,
                    Some(&settings),
                    true,
                );
                if !wait_for_reload_or_retry(&mut reload_rx).await {
                    return;
                }
                continue;
            }
        };
        tokio::pin!(activated_stream);

        {
            let mut snapshot = lock_runtime_snapshot();
            snapshot.portal_supported = true;
            snapshot.portal_active = true;
            snapshot.last_error = None;
        }
        if let Ok(mut last_status) = HOTKEY_RUNTIME_LAST_STATUS_KEY
            .get_or_init(|| Mutex::new(None))
            .lock()
        {
            *last_status = None;
        }

        let mut should_shutdown = false;
        let mut portal_stream_ended = false;

        loop {
            tokio::select! {
                changed = reload_rx.changed() => {
                    if changed.is_err() {
                        should_shutdown = true;
                    }
                    break;
                }
                activation = activated_stream.next() => {
                    let Some(activation) = activation else {
                        portal_stream_ended = true;
                        break;
                    };

                    if let Some(target) = portal_targets.get(activation.shortcut_id()) {
                        match target {
                            PortalShortcutTarget::ToggleLauncher => {
                                toggle_launcher(&app);
                            }
                            PortalShortcutTarget::Command(command_id) => {
                                dispatch_hotkey_command(&app, command_id.clone(), "portal");
                            }
                        }
                    }
                }
            }
        }

        let _ = session.close().await;
        {
            let mut snapshot = lock_runtime_snapshot();
            snapshot.portal_active = false;
            if portal_stream_ended {
                snapshot.last_error = Some("portal shortcut event stream closed".to_string());
            }
        }

        if should_shutdown {
            return;
        }
        if portal_stream_ended && !wait_for_reload_or_retry(&mut reload_rx).await {
            return;
        }
    }
}

#[cfg(target_os = "linux")]
fn build_portal_shortcuts(
    settings: &HotkeySettings,
) -> (Vec<NewShortcut>, HashMap<String, PortalShortcutTarget>) {
    let mut shortcuts = Vec::new();
    let mut targets = HashMap::new();

    let mut launcher_shortcut = NewShortcut::new(
        HOTKEYS_CONFIG.portal_launcher_shortcut_id,
        "Toggle Beam launcher",
    );
    if let Some(trigger) = format_portal_preferred_trigger(&settings.global_shortcut) {
        launcher_shortcut = launcher_shortcut.preferred_trigger(Some(trigger.as_str()));
    }
    shortcuts.push(launcher_shortcut);
    targets.insert(
        HOTKEYS_CONFIG.portal_launcher_shortcut_id.to_string(),
        PortalShortcutTarget::ToggleLauncher,
    );

    for (index, (command_id, hotkey)) in settings.command_hotkeys.iter().enumerate() {
        let shortcut_id = format!(
            "{}.{}",
            HOTKEYS_CONFIG.portal_command_shortcut_prefix,
            index + 1
        );
        let description = format!("Run Beam command {}", command_id);
        let mut command_shortcut = NewShortcut::new(&shortcut_id, description);
        if let Some(trigger) = format_portal_preferred_trigger(hotkey) {
            command_shortcut = command_shortcut.preferred_trigger(Some(trigger.as_str()));
        }
        shortcuts.push(command_shortcut);
        targets.insert(
            shortcut_id,
            PortalShortcutTarget::Command(command_id.clone()),
        );
    }

    (shortcuts, targets)
}
