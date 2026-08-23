use tauri::{AppHandle, Emitter, Manager};

use super::rules::normalize_rule;
use super::time::now_ms;
use super::types::{FocusSession, FocusSessionMode, FocusSnoozeTargetType};
use super::FOCUS_APP_BLOCKED_EVENT;
use crate::state::AppState;

#[cfg(target_os = "linux")]
fn platform_list_windows(
    app: &AppHandle,
    app_state: &AppState,
) -> Result<Vec<crate::window_switcher::WindowEntry>, String> {
    crate::linux_desktop::window_manager::list_windows(app, app_state)
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn platform_list_windows(
    app: &AppHandle,
    app_state: &AppState,
) -> Result<Vec<crate::window_switcher::WindowEntry>, String> {
    crate::windows_desktop::window_manager::list_windows(app, app_state)
        .map_err(|error| error.to_string())
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn platform_list_windows(
    _app: &AppHandle,
    _app_state: &AppState,
) -> Result<Vec<crate::window_switcher::WindowEntry>, String> {
    Err("window management is not supported on this platform".to_string())
}

#[cfg(target_os = "linux")]
fn platform_close_window(window_id: &str) -> Result<(), String> {
    crate::linux_desktop::window_manager::close_window(window_id).map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn platform_close_window(window_id: &str) -> Result<(), String> {
    crate::windows_desktop::window_manager::close_window(window_id)
        .map_err(|error| error.to_string())
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn platform_close_window(_window_id: &str) -> Result<(), String> {
    Err("window management is not supported on this platform".to_string())
}

struct PlatformFocusedWindow {
    id: String,
    title: String,
    app_name: String,
    class_name: String,
    app_id: Option<String>,
}

#[cfg(target_os = "linux")]
fn platform_frontmost_window(app_state: &AppState) -> Option<PlatformFocusedWindow> {
    crate::linux_desktop::window_manager::frontmost_window(app_state)
        .ok()
        .flatten()
        .map(|focused| PlatformFocusedWindow {
            id: focused.id,
            title: focused.title,
            app_name: focused.app_name,
            class_name: focused.class_name,
            app_id: focused.app_id,
        })
}

#[cfg(target_os = "windows")]
fn platform_frontmost_window(app_state: &AppState) -> Option<PlatformFocusedWindow> {
    crate::windows_desktop::window_manager::frontmost_window(app_state)
        .ok()
        .flatten()
        .map(|focused| PlatformFocusedWindow {
            id: focused.id,
            title: focused.title,
            app_name: focused.app_name,
            class_name: focused.class_name,
            app_id: focused.app_id,
        })
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn platform_frontmost_window(_app_state: &AppState) -> Option<PlatformFocusedWindow> {
    None
}

fn lower_contains_rule(values: &[&str], rules: &[String]) -> Option<String> {
    for value in values {
        let lower = value.trim().to_ascii_lowercase();
        if lower.is_empty() {
            continue;
        }
        for rule in rules {
            if lower == *rule || lower.contains(rule) || rule.contains(&lower) {
                return Some(rule.clone());
            }
        }
    }
    None
}

fn is_snoozed(session: &FocusSession, target_type: FocusSnoozeTargetType, target: &str) -> bool {
    let normalized_target = target.trim().to_ascii_lowercase();
    session.snoozes.iter().any(|snooze| {
        snooze.target_type == target_type && snooze.expires_at > now_ms() && {
            let snooze_target = snooze.target.trim().to_ascii_lowercase();
            normalized_target == snooze_target
                || normalized_target.contains(&snooze_target)
                || snooze_target.contains(&normalized_target)
        }
    })
}

fn should_block_app_values(session: &FocusSession, values: &[&str]) -> Option<String> {
    if session.resolved_apps.is_empty() {
        return None;
    }

    let beam_window = values
        .iter()
        .any(|value| value.trim().eq_ignore_ascii_case("beam"));
    if beam_window {
        return None;
    }

    let matched_rule = lower_contains_rule(values, &session.resolved_apps);
    match session.mode {
        FocusSessionMode::Block => matched_rule,
        FocusSessionMode::Allow => {
            if matched_rule.is_some() {
                None
            } else {
                values
                    .iter()
                    .find_map(|value| normalize_rule(value))
                    .or_else(|| Some("unknown app".to_string()))
            }
        }
    }
}

fn emit_blocked_app(app: &AppHandle, rule: &str, window_title: &str, app_name: &str) {
    let _ = app.emit(
        FOCUS_APP_BLOCKED_EVENT,
        serde_json::json!({
            "target": rule,
            "windowTitle": window_title,
            "appName": app_name,
        }),
    );
}

pub fn enforce_app_rules(app: &AppHandle, session: &FocusSession) {
    if session.resolved_apps.is_empty() {
        return;
    }

    let app_state = app.state::<AppState>();
    if let Ok(windows) = platform_list_windows(app, &app_state) {
        for window in windows {
            let values = [
                window.app_name.as_str(),
                window.class_name.as_str(),
                window.app_id.as_deref().unwrap_or_default(),
            ];
            let Some(rule) = should_block_app_values(session, &values) else {
                continue;
            };
            if is_snoozed(session, FocusSnoozeTargetType::App, &rule) {
                continue;
            }
            emit_blocked_app(app, &rule, &window.title, &window.app_name);
            if let Err(error) = platform_close_window(&window.id) {
                log::warn!("failed to close blocked app window: {error}");
            }
        }
    }

    let Some(focused) = platform_frontmost_window(&app_state) else {
        return;
    };

    let values = [
        focused.app_name.as_str(),
        focused.class_name.as_str(),
        focused.app_id.as_deref().unwrap_or_default(),
    ];
    let Some(rule) = should_block_app_values(session, &values) else {
        return;
    };
    if is_snoozed(session, FocusSnoozeTargetType::App, &rule) {
        return;
    }

    emit_blocked_app(app, &rule, &focused.title, &focused.app_name);
    if let Err(error) = platform_close_window(&focused.id) {
        log::warn!("failed to close blocked app window: {error}");
    }
}
