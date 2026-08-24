// PORT: apps/desktop/src-tauri/src/focus/enforcement.rs
// AppHandle became &BeamContext; blocked-app events ride the typed bus.
// The windows_desktop backend lands with lane A5b; its branch is gated out
// until then.

use beam_core::{events::FocusAppBlocked, BeamContext, BeamEvent};

use super::rules::normalize_rule;
use super::time::now_ms;
use super::types::{FocusSession, FocusSessionMode, FocusSnoozeTargetType};
use crate::state::AppState;

#[cfg(target_os = "linux")]
use crate::linux_desktop::window_manager as desktop_backend;

#[cfg(target_os = "macos")]
use crate::macos::window_manager as desktop_backend;

#[cfg(target_os = "windows")]
use crate::windows_desktop::window_manager as desktop_backend;

#[cfg(target_os = "windows")]
fn desktop_backend_list_windows(
    state: &AppState,
) -> Result<Vec<crate::window_switcher::WindowEntry>, String> {
    crate::windows_desktop::window_manager::list_windows(state)
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

fn emit_blocked_app(cx: &BeamContext, rule: &str, window_title: &str, app_name: &str) {
    cx.emit(BeamEvent::FocusAppBlocked(FocusAppBlocked {
        target: rule.to_string(),
        window_title: window_title.to_string(),
        app_name: app_name.to_string(),
    }));
}

pub fn enforce_app_rules(cx: &BeamContext, state: &AppState, session: &FocusSession) {
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let _ = (cx, state, session);
    }

    #[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
    enforce_app_rules_supported(cx, state, session);
}

#[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
fn enforce_app_rules_supported(cx: &BeamContext, state: &AppState, session: &FocusSession) {
    if session.resolved_apps.is_empty() {
        return;
    }

    #[cfg(target_os = "windows")]
    let windows_result = desktop_backend_list_windows(state);
    #[cfg(not(target_os = "windows"))]
    let windows_result = desktop_backend::list_windows(state);

    if let Ok(windows) = windows_result {
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
            emit_blocked_app(cx, &rule, &window.title, &window.app_name);
            if let Err(error) = desktop_backend::close_window(&window.id) {
                log::warn!("failed to close blocked app window: {error}");
            }
        }
    }

    let Ok(Some(focused)) = desktop_backend::frontmost_window(state) else {
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

    emit_blocked_app(cx, &rule, &focused.title, &focused.app_name);
    if let Err(error) = desktop_backend::close_window(&focused.id) {
        log::warn!("failed to close blocked app window: {error}");
    }
}
