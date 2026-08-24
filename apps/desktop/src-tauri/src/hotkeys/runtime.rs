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

use super::models::HotkeyCapabilities;
#[cfg(any(target_os = "linux", target_os = "windows"))]
use super::models::HotkeySettings;
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

    #[cfg(target_os = "windows")]
    {
        start_windows_hotkey_runtime(app.clone());
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
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
        let _ = crate::launcher_window::hide_main_launcher_window(app);
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
    #[cfg(target_os = "windows")]
    {
        let snapshot = read_runtime_snapshot();
        let mut notes = vec![
            "Global shortcuts are registered through the Windows RegisterHotKey API.".to_string(),
        ];
        if let Some(last_error) = snapshot.last_error {
            notes.push(format!("Some shortcuts failed to register: {last_error}"));
        }

        return HotkeyCapabilities {
            session_type: detect_session_type(),
            compositor: detect_compositor(),
            backend: "win32-register-hotkey".to_string(),
            global_launcher_supported: true,
            global_command_hotkeys_supported: true,
            launcher_only_supported: true,
            notes,
        };
    }

    #[cfg(not(target_os = "windows"))]
    {
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
    // send_modify bumps the counter and marks the channel as changed so the
    // waiting runtime wakes up immediately.
    reload_tx.send_modify(|current| {
        *current = current.wrapping_add(1);
    });
}

#[cfg(target_os = "windows")]
pub(super) fn request_hotkey_runtime_reload() {
    request_windows_hotkey_reload();
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
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

#[cfg(target_os = "windows")]
fn detect_session_type() -> String {
    "desktop".to_string()
}

#[cfg(not(target_os = "windows"))]
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

#[cfg(target_os = "windows")]
fn detect_compositor() -> String {
    "explorer".to_string()
}

#[cfg(not(target_os = "windows"))]
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

#[cfg(target_os = "windows")]
mod windows_backend {
    use std::sync::atomic::AtomicI32;

    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::System::Threading::GetCurrentThreadId;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        RegisterHotKey, UnregisterHotKey, VkKeyScanW, HOT_KEY_MODIFIERS, MOD_ALT, MOD_CONTROL,
        MOD_NOREPEAT, MOD_SHIFT, MOD_WIN,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, GetMessageW, PostThreadMessageW, TranslateMessage, MSG, WM_HOTKEY,
    };

    use super::{dispatch_hotkey_command, lock_runtime_snapshot, toggle_launcher, HotkeySettings};
    use crate::custom_config;
    use tauri::AppHandle;

    pub(super) const LAUNCHER_HOTKEY_ID: i32 = 1;
    const FIRST_COMMAND_HOTKEY_ID: i32 = 2;
    const WM_APP_RELOAD: u32 = 0x8000 + 7;

    pub(super) static WINDOWS_HOTKEY_THREAD_ID: std::sync::OnceLock<AtomicI32> =
        std::sync::OnceLock::new();

    struct RegisteredHotkey {
        id: i32,
        command_id: Option<String>,
    }

    fn store_thread_id() {
        let thread_id = unsafe { GetCurrentThreadId() };
        let cell = WINDOWS_HOTKEY_THREAD_ID.get_or_init(|| AtomicI32::new(0));
        cell.store(thread_id as i32, std::sync::atomic::Ordering::SeqCst);
    }

    pub(super) fn request_reload() {
        let Some(cell) = WINDOWS_HOTKEY_THREAD_ID.get() else {
            return;
        };
        let thread_id = cell.load(std::sync::atomic::Ordering::SeqCst);
        if thread_id == 0 {
            return;
        }
        unsafe {
            let _ = PostThreadMessageW(thread_id as u32, WM_APP_RELOAD, WPARAM(0), LPARAM(0));
        }
    }

    fn parse_modifier(token: &str) -> Option<HOT_KEY_MODIFIERS> {
        match token.to_lowercase().as_str() {
            "super" | "meta" | "win" | "command" | "cmd" | "mod4" => Some(MOD_WIN),
            "ctrl" | "control" => Some(MOD_CONTROL),
            "alt" | "option" | "opt" | "mod1" => Some(MOD_ALT),
            "shift" => Some(MOD_SHIFT),
            _ => None,
        }
    }

    fn named_virtual_key(key: &str) -> Option<u16> {
        match key {
            "space" | "spacebar" => Some(0x20),
            "enter" | "return" => Some(0x0D),
            "escape" | "esc" => Some(0x1B),
            "tab" => Some(0x09),
            "backspace" => Some(0x08),
            "delete" | "del" => Some(0x2E),
            "insert" | "ins" => Some(0x2D),
            "home" => Some(0x24),
            "end" => Some(0x23),
            "pageup" | "pgup" => Some(0x21),
            "pagedown" | "pgdn" => Some(0x22),
            "left" => Some(0x25),
            "up" => Some(0x26),
            "right" => Some(0x27),
            "down" => Some(0x28),
            ";" | "semicolon" => Some(0xBA),
            "=" | "equals" => Some(0xBB),
            "," | "comma" => Some(0xBC),
            "-" | "minus" => Some(0xBD),
            "." | "period" => Some(0xBE),
            "/" | "slash" => Some(0xBF),
            "`" | "grave" | "backquote" => Some(0xC0),
            "[" | "bracketleft" => Some(0xDB),
            "\\" | "backslash" => Some(0xDC),
            "]" | "bracketright" => Some(0xDD),
            "'" | "quote" => Some(0xDE),
            _ => None,
        }
    }

    /// Parses `ctrl+alt+space` style accelerators into Win32 hotkey parts.
    /// MOD_NOREPEAT is always included so holding a key does not re-trigger.
    pub(super) fn parse_accelerator(shortcut: &str) -> Option<(HOT_KEY_MODIFIERS, u32)> {
        let tokens: Vec<&str> = shortcut
            .split('+')
            .map(|token| token.trim())
            .filter(|token| !token.is_empty())
            .collect();
        if tokens.is_empty() {
            return None;
        }

        let mut modifiers = HOT_KEY_MODIFIERS(MOD_NOREPEAT.0);
        for token in &tokens[..tokens.len() - 1] {
            modifiers = HOT_KEY_MODIFIERS(modifiers.0 | parse_modifier(token)?.0);
        }

        let raw_key = tokens[tokens.len() - 1];
        let normalized = raw_key.to_lowercase();
        let virtual_key = if normalized.len() == 1 {
            let character = normalized.chars().next()?;
            if character.is_ascii_alphanumeric() {
                Some(character.to_ascii_uppercase() as u16)
            } else {
                named_virtual_key(&normalized).or_else(|| {
                    let scan = unsafe { VkKeyScanW(character as u16) };
                    if scan as i16 == -1 {
                        None
                    } else {
                        Some((scan & 0xFF) as u16)
                    }
                })
            }
        } else if let Some(function_number) = normalized
            .strip_prefix('f')
            .and_then(|value| value.parse::<u16>().ok())
        {
            (1..=24)
                .contains(&function_number)
                .then_some(0x6F + function_number)
        } else {
            named_virtual_key(&normalized)
        }?;

        Some((modifiers, u32::from(virtual_key)))
    }

    fn register(id: i32, mods: HOT_KEY_MODIFIERS, vk: u32) -> Result<(), String> {
        unsafe { RegisterHotKey(None, id, mods, vk) }.map_err(|error| error.to_string())
    }

    fn unregister_all(hotkeys: &[RegisteredHotkey]) {
        for hotkey in hotkeys {
            unsafe {
                let _ = UnregisterHotKey(None, hotkey.id);
            }
        }
    }

    fn set_snapshot(active: bool, last_error: Option<String>) {
        let mut snapshot = lock_runtime_snapshot();
        snapshot.portal_supported = true;
        snapshot.portal_active = active;
        snapshot.last_error = last_error;
    }

    pub(super) fn run(app: AppHandle) {
        use std::collections::BTreeMap;

        store_thread_id();

        loop {
            let settings = crate::hotkeys::store::open_store(&app)
                .map(|store| crate::hotkeys::store::read_hotkey_settings(&store))
                .unwrap_or(HotkeySettings {
                    global_shortcut: String::new(),
                    command_hotkeys: BTreeMap::new(),
                });

            let (registered, failures) = register_hotkeys(&app, &settings);
            let failure_message = failures.join("; ");
            set_snapshot(
                true,
                (!failure_message.is_empty()).then_some(failure_message),
            );

            let mut message = MSG::default();
            let mut should_exit = false;
            let mut reload_requested = false;

            while !reload_requested && !should_exit {
                let outcome = unsafe { GetMessageW(&mut message, None, 0, 0) };
                if !outcome.as_bool() {
                    should_exit = true;
                    break;
                }

                unsafe {
                    let _ = TranslateMessage(&message);
                    DispatchMessageW(&message);
                }

                if message.message == WM_HOTKEY {
                    let hotkey_id = message.wParam.0 as i32;
                    if let Some(target) = registered.iter().find(|h| h.id == hotkey_id) {
                        match &target.command_id {
                            None => toggle_launcher(&app),
                            Some(command_id) => {
                                dispatch_hotkey_command(&app, command_id.clone(), "windows-hotkey")
                            }
                        }
                    }
                } else if message.message == WM_APP_RELOAD {
                    reload_requested = true;
                }
            }

            unregister_all(&registered);

            if should_exit {
                set_snapshot(false, None);
                return;
            }
        }
    }

    fn register_hotkeys(
        app: &AppHandle,
        settings: &HotkeySettings,
    ) -> (Vec<RegisteredHotkey>, Vec<String>) {
        let mut registered = Vec::new();
        let mut failures = Vec::new();

        let launcher_trigger = settings.global_shortcut.as_str();
        match parse_accelerator(launcher_trigger)
            .ok_or_else(|| "invalid accelerator".to_string())
            .and_then(|(mods, vk)| register(LAUNCHER_HOTKEY_ID, mods, vk))
        {
            Ok(()) => registered.push(RegisteredHotkey {
                id: LAUNCHER_HOTKEY_ID,
                command_id: None,
            }),
            Err(error) => failures.push(format!("launcher shortcut '{launcher_trigger}': {error}")),
        }

        let mut next_id = FIRST_COMMAND_HOTKEY_ID;
        for (command_id, trigger) in &settings.command_hotkeys {
            if custom_config::is_command_hidden(app, command_id) {
                continue;
            }
            match parse_accelerator(trigger)
                .ok_or_else(|| "invalid accelerator".to_string())
                .and_then(|(mods, vk)| register(next_id, mods, vk))
            {
                Ok(()) => registered.push(RegisteredHotkey {
                    id: next_id,
                    command_id: Some(command_id.clone()),
                }),
                Err(error) => failures.push(format!("command '{command_id}' ({trigger}): {error}")),
            }
            next_id += 1;
        }

        (registered, failures)
    }
}

#[cfg(target_os = "windows")]
fn start_windows_hotkey_runtime(app: AppHandle) {
    std::thread::Builder::new()
        .name("beam-windows-hotkeys".to_string())
        .spawn(move || windows_backend::run(app))
        .expect("failed to spawn windows hotkey thread");
}

#[cfg(target_os = "windows")]
fn request_windows_hotkey_reload() {
    windows_backend::request_reload();
}

#[cfg(all(test, target_os = "windows"))]
mod windows_tests {
    use super::windows_backend::parse_accelerator;

    #[test]
    fn parses_modifier_combinations_case_insensitively() {
        let (mods, vk) = parse_accelerator("Ctrl+Alt+Space").expect("ctrl+alt+space parses");
        assert_ne!(mods.0 & 0x0002, 0, "ctrl flag set");
        assert_ne!(mods.0 & 0x0001, 0, "alt flag set");
        assert_eq!(vk, 0x20);

        let (_, vk) = parse_accelerator("SHIFT+F5").expect("shift+f5 parses");
        assert_eq!(vk, 0x74);
    }

    #[test]
    fn includes_norepeat_flag_in_every_accelerator() {
        const MOD_NOREPEAT: u32 = 0x4000;
        for shortcut in ["alt+space", "super+k", "ctrl+shift+esc"] {
            let (mods, _) = parse_accelerator(shortcut).expect("valid accelerator");
            assert_ne!(mods.0 & MOD_NOREPEAT, 0, "{shortcut} carries MOD_NOREPEAT");
        }
    }

    #[test]
    fn maps_single_letters_and_digits_to_vk_codes() {
        let (_, vk) = parse_accelerator("ctrl+p").expect("ctrl+p");
        assert_eq!(vk, u32::from(b'P'));

        let (_, vk) = parse_accelerator("alt+7").expect("alt+7");
        assert_eq!(vk, u32::from(b'7'));
    }

    #[test]
    fn rejects_unknown_tokens_and_bare_keys() {
        assert!(parse_accelerator("notamodifier+x").is_none());
        assert!(parse_accelerator("f99").is_none());
        assert!(parse_accelerator("").is_none());
    }

    #[test]
    fn resolves_named_and_punctuation_keys() {
        for (shortcut, expected) in [
            ("ctrl+enter", 0x0Du32),
            ("ctrl+backspace", 0x08),
            ("ctrl+pageup", 0x21),
            ("alt+slash", 0xBF),
            ("cmd+comma", 0xBC),
        ] {
            let (_, vk) = parse_accelerator(shortcut).expect(shortcut);
            assert_eq!(vk, expected, "{shortcut}");
        }
    }
}
