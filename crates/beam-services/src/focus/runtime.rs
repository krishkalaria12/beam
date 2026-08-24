use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use once_cell::sync::Lazy;
use parking_lot::RwLock;

use beam_core::{BeamContext, BeamEvent};

use super::enforcement;
use super::rules::{
    normalize_category_input, normalize_draft, normalize_rule, normalize_text, resolve_rules,
};
use super::store::{load_focus_state, save_focus_state, PersistedFocusState};
use super::time::now_ms;
use super::types::{
    FocusBrowserPolicy, FocusCapabilityReport, FocusCategory, FocusCategoryImportItem,
    FocusCategoryInput, FocusSession, FocusSessionDraft, FocusSessionMode, FocusSessionStatus,
    FocusSnooze, FocusSnoozeInput, FocusSnoozeTargetType, FocusStatus,
};
use super::{error::FocusError, error::Result};
use crate::state::AppState;

#[cfg(target_os = "macos")]
use crate::macos::window_manager as desktop_backend;

pub const FOCUS_STATUS_EVENT: &str = "focus-status-updated";
pub const FOCUS_APP_BLOCKED_EVENT: &str = "focus-app-blocked";
// Tray ids preserved for the lane-A5 tray integration (the wire names stay
// greppable against the Tauri build).
#[allow(dead_code)]
const FOCUS_TRAY_ID: &str = "beam-focus-mode";
#[allow(dead_code)]
const FOCUS_TRAY_OPEN_ID: &str = "focus.open";
#[allow(dead_code)]
const FOCUS_TRAY_PAUSE_ID: &str = "focus.pause";
#[allow(dead_code)]
const FOCUS_TRAY_RESUME_ID: &str = "focus.resume";
#[allow(dead_code)]
const FOCUS_TRAY_COMPLETE_ID: &str = "focus.complete";

static INITIALIZED: AtomicBool = AtomicBool::new(false);
static RUNTIME_LOOP_RUNNING: AtomicBool = AtomicBool::new(false);
static APP_STATE: std::sync::OnceLock<std::sync::Arc<AppState>> = std::sync::OnceLock::new();
static FOCUS_STATE: Lazy<RwLock<PersistedFocusState>> =
    Lazy::new(|| RwLock::new(PersistedFocusState::default()));

fn prune_expired_snoozes(session: &mut FocusSession, now: i64) {
    session.snoozes.retain(|snooze| snooze.expires_at > now);
}

fn is_running(session: &FocusSession) -> bool {
    matches!(session.status, FocusSessionStatus::Running)
}

fn emit_status(cx: &BeamContext) {
    let status = get_status();
    cx.emit(BeamEvent::FocusStatusUpdated(
        serde_json::to_value(status).unwrap_or(serde_json::Value::Null),
    ));
}

#[allow(dead_code)] // used by the lane-A5 tray integration
fn format_tray_remaining(session: &FocusSession, now: i64) -> String {
    let Some(ends_at) = session.ends_at else {
        return "Focus".to_string();
    };
    let remaining_seconds = if session.status == FocusSessionStatus::Paused {
        session
            .paused_at
            .map(|paused_at| ends_at.saturating_sub(paused_at))
            .unwrap_or_else(|| ends_at.saturating_sub(now))
    } else {
        ends_at.saturating_sub(now)
    } / 1000;
    let minutes = remaining_seconds / 60;
    let seconds = remaining_seconds % 60;
    format!("{minutes}:{seconds:02}")
}

/// TODO(PORT: apps/desktop/src-tauri/src/menu_bar.rs + tray spike): the
/// focus tray lands with the tray-icon integration (lane A5). Until then
/// the tray is a no-op and the launcher panel is the only focus surface.
fn update_focus_tray(_cx: &BeamContext) {}

fn save_and_emit(cx: &BeamContext) -> Result<()> {
    let state = FOCUS_STATE.read().clone();
    save_focus_state(cx, &state)?;
    update_focus_tray(cx);
    emit_status(cx);
    Ok(())
}

fn current_session_snapshot() -> Option<FocusSession> {
    FOCUS_STATE.read().session.clone()
}

fn sync_session_rules(session: &mut FocusSession, categories: &[FocusCategory]) {
    let known_category_ids: HashSet<&str> = categories
        .iter()
        .map(|category| category.id.as_str())
        .collect();
    session
        .category_ids
        .retain(|category_id| known_category_ids.contains(category_id.as_str()));
    let (resolved_apps, resolved_websites) = resolve_rules(
        categories,
        &session.category_ids,
        &session.direct_apps,
        &session.direct_websites,
    );
    session.resolved_apps = resolved_apps;
    session.resolved_websites = resolved_websites;
}

fn complete_expired_session(cx: &BeamContext, now: i64) -> bool {
    let mut changed = false;
    {
        let mut state = FOCUS_STATE.write();
        let Some(session) = state.session.as_mut() else {
            return false;
        };

        prune_expired_snoozes(session, now);
        if session.status == FocusSessionStatus::Running {
            if let Some(ends_at) = session.ends_at {
                if now >= ends_at {
                    session.status = FocusSessionStatus::Completed;
                    session.completed_at = Some(now);
                    changed = true;
                }
            }
        }
    }

    if changed {
        let _ = save_and_emit(cx);
    }

    changed
}

fn enforce_active_session(cx: &BeamContext) {
    let Some(state) = APP_STATE.get() else {
        return;
    };
    let Some(session) = current_session_snapshot() else {
        return;
    };
    if !is_running(&session) {
        return;
    }
    enforcement::enforce_app_rules(cx, state, &session);
}

fn start_runtime_loop(cx: BeamContext) {
    if RUNTIME_LOOP_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    std::thread::spawn(move || loop {
        let now = now_ms();
        complete_expired_session(&cx, now);
        enforce_active_session(&cx);
        update_focus_tray(&cx);
        std::thread::sleep(Duration::from_millis(1500));
    });
}

pub fn initialize(cx: &BeamContext, state: std::sync::Arc<AppState>) {
    let _ = APP_STATE.set(state);

    if INITIALIZED
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    match load_focus_state(cx) {
        Ok(mut state) => {
            let now = now_ms();
            let categories = state.categories.clone();
            if let Some(session) = state.session.as_mut() {
                sync_session_rules(session, &categories);
            }
            if let Some(session) = state.session.as_mut() {
                prune_expired_snoozes(session, now);
                if session.status == FocusSessionStatus::Running {
                    if let Some(ends_at) = session.ends_at {
                        if now >= ends_at {
                            session.status = FocusSessionStatus::Completed;
                            session.completed_at = Some(now);
                        }
                    }
                }
            }
            *FOCUS_STATE.write() = state;
        }
        Err(error) => log::warn!("failed to initialize focus state: {error}"),
    }

    start_runtime_loop(cx.clone());
    update_focus_tray(cx);
}

pub fn get_status() -> FocusStatus {
    let state = FOCUS_STATE.read().clone();
    FocusStatus {
        categories: state.categories,
        last_draft: state.last_draft,
        session: state.session,
        now: now_ms(),
        capabilities: capability_report(),
    }
}

pub fn capability_report() -> FocusCapabilityReport {
    #[cfg(target_os = "linux")]
    {
        let capabilities = linux_desktop::window_manager::active_capabilities();
        let backend = linux_desktop::window_manager::active_backend_kind()
            .as_str()
            .to_string();
        let browser_connected = browser_extension_has_connected_client();
        let mut notes = Vec::new();
        if !capabilities.supports_frontmost_application {
            notes.push(
                "App blocking requires focused-window detection on this desktop session."
                    .to_string(),
            );
        }
        if !browser_connected {
            notes.push(
                "Website blocking requires the Beam browser extension to be installed and connected."
                    .to_string(),
            );
        }

        FocusCapabilityReport {
            app_blocking_supported: capabilities.supports_frontmost_application,
            website_blocking_supported: browser_connected,
            backend,
            notes,
        }
    }

    #[cfg(target_os = "macos")]
    {
        let capabilities = desktop_backend::active_capabilities();
        let backend = desktop_backend::active_backend_kind().as_str().to_string();
        let browser_connected = browser_extension_has_connected_client();
        let mut notes = Vec::new();
        if !capabilities.supports_frontmost_application {
            notes.push(
                "Grant Beam the Accessibility permission in System Settings to enable app blocking."
                    .to_string(),
            );
        }
        if !browser_connected {
            notes.push(
                "Website blocking requires the Beam browser extension to be installed and connected."
                    .to_string(),
            );
        }

        FocusCapabilityReport {
            app_blocking_supported: capabilities.supports_frontmost_application,
            website_blocking_supported: browser_connected,
            backend,
            notes,
        }
    }

    #[cfg(target_os = "windows")]
    {
        let browser_connected = browser_extension_has_connected_client();
        let mut notes = Vec::new();
        notes.push("App blocking uses the Windows foreground window tracker.".to_string());
        if !browser_connected {
            notes.push(
                "Website blocking requires the Beam browser extension to be installed and connected."
                    .to_string(),
            );
        }

        FocusCapabilityReport {
            app_blocking_supported: true,
            website_blocking_supported: browser_connected,
            backend: "win32-window-manager".to_string(),
            notes,
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let browser_connected = browser_extension_has_connected_client();
        let mut notes =
            vec!["App blocking is currently implemented for Linux and macOS sessions.".to_string()];
        if !browser_connected {
            notes.push(
                "Website blocking requires the Beam browser extension to be installed and connected."
                    .to_string(),
            );
        }

        FocusCapabilityReport {
            app_blocking_supported: false,
            website_blocking_supported: browser_connected,
            backend: "unsupported".to_string(),
            notes,
        }
    }
}

/// TODO(PORT: apps/desktop/src-tauri/src/extensions/browser_extension):
/// lands with the extensions module (lane A6).
fn browser_extension_has_connected_client() -> bool {
    false
}

pub fn create_category(cx: &BeamContext, input: FocusCategoryInput) -> Result<FocusCategory> {
    let now = now_ms();
    let category = normalize_category_input(input, now)?;
    {
        let mut state = FOCUS_STATE.write();
        state.categories.push(category.clone());
        state
            .categories
            .sort_by(|left, right| left.title.to_lowercase().cmp(&right.title.to_lowercase()));
    }
    save_and_emit(cx)?;
    Ok(category)
}

pub fn update_category(
    cx: &BeamContext,
    id: String,
    input: FocusCategoryInput,
) -> Result<FocusCategory> {
    let normalized_id = normalize_text(&id).ok_or(FocusError::CategoryNotFound)?;
    let now = now_ms();
    let next = normalize_category_input(
        FocusCategoryInput {
            id: Some(normalized_id.clone()),
            title: input.title,
            apps: input.apps,
            websites: input.websites,
        },
        now,
    )?;

    let updated = {
        let mut state = FOCUS_STATE.write();
        let Some(existing_index) = state
            .categories
            .iter()
            .position(|category| category.id == normalized_id)
        else {
            return Err(FocusError::CategoryNotFound);
        };
        let created_at = state.categories[existing_index].created_at;
        state.categories[existing_index] = FocusCategory {
            created_at,
            ..next.clone()
        };
        state
            .categories
            .sort_by(|left, right| left.title.to_lowercase().cmp(&right.title.to_lowercase()));
        let categories = state.categories.clone();
        if let Some(session) = state.session.as_mut() {
            sync_session_rules(session, &categories);
        }
        state
            .categories
            .iter()
            .find(|category| category.id == normalized_id)
            .cloned()
            .ok_or(FocusError::CategoryNotFound)?
    };

    save_and_emit(cx)?;
    enforce_active_session(cx);
    Ok(updated)
}

pub fn delete_category(cx: &BeamContext, id: String) -> Result<()> {
    let normalized_id = normalize_text(&id).ok_or(FocusError::CategoryNotFound)?;
    {
        let mut state = FOCUS_STATE.write();
        let before_len = state.categories.len();
        state
            .categories
            .retain(|category| category.id != normalized_id);
        if state.categories.len() == before_len {
            return Err(FocusError::CategoryNotFound);
        }
        state
            .last_draft
            .category_ids
            .retain(|category_id| category_id != &normalized_id);
        let categories = state.categories.clone();
        if let Some(session) = state.session.as_mut() {
            sync_session_rules(session, &categories);
        }
    }
    save_and_emit(cx)?;
    enforce_active_session(cx);
    Ok(())
}

pub fn import_categories(cx: &BeamContext, payload: String) -> Result<Vec<FocusCategory>> {
    let parsed = serde_json::from_str::<Vec<FocusCategoryImportItem>>(&payload)
        .or_else(|_| {
            serde_json::from_str::<serde_json::Value>(&payload).and_then(|value| {
                serde_json::from_value::<Vec<FocusCategoryImportItem>>(
                    value.get("categories").cloned().unwrap_or(value),
                )
            })
        })
        .map_err(|error| FocusError::InvalidImport(error.to_string()))?;

    let mut created = Vec::new();
    for item in parsed {
        let category = create_category(
            cx,
            FocusCategoryInput {
                id: None,
                title: item.title,
                apps: item.apps,
                websites: item.websites,
            },
        )?;
        created.push(category);
    }
    Ok(created)
}

pub fn start_session(cx: &BeamContext, draft: FocusSessionDraft) -> Result<FocusSession> {
    let draft = normalize_draft(draft)?;
    let now = now_ms();
    let session = {
        let mut state = FOCUS_STATE.write();
        let (resolved_apps, resolved_websites) = resolve_rules(
            &state.categories,
            &draft.category_ids,
            &draft.apps,
            &draft.websites,
        );
        let ends_at = draft
            .duration_seconds
            .map(|seconds| now + (seconds as i64 * 1000));
        let session = FocusSession {
            id: nanoid::nanoid!(),
            goal: draft.goal.clone(),
            duration_seconds: draft.duration_seconds,
            mode: draft.mode,
            category_ids: draft.category_ids.clone(),
            direct_apps: draft.apps.clone(),
            direct_websites: draft.websites.clone(),
            resolved_apps,
            resolved_websites,
            status: FocusSessionStatus::Running,
            started_at: now,
            ends_at,
            paused_at: None,
            total_paused_ms: 0,
            snoozes: Vec::new(),
            completed_at: None,
        };
        state.last_draft = draft;
        state.session = Some(session.clone());
        session
    };
    save_and_emit(cx)?;
    enforce_active_session(cx);
    Ok(session)
}

pub fn edit_session(cx: &BeamContext, draft: FocusSessionDraft) -> Result<FocusSession> {
    let draft = normalize_draft(draft)?;
    let now = now_ms();
    let updated = {
        let mut state = FOCUS_STATE.write();
        let categories = state.categories.clone();
        state.last_draft = draft.clone();
        let Some(session) = state.session.as_mut() else {
            return Err(FocusError::NoActiveSession);
        };
        let (resolved_apps, resolved_websites) = resolve_rules(
            &categories,
            &draft.category_ids,
            &draft.apps,
            &draft.websites,
        );
        let elapsed_active_ms = if session.status == FocusSessionStatus::Paused {
            session
                .paused_at
                .unwrap_or(now)
                .saturating_sub(session.started_at)
                .saturating_sub(session.total_paused_ms)
        } else {
            now.saturating_sub(session.started_at)
                .saturating_sub(session.total_paused_ms)
        };
        session.goal = draft.goal.clone();
        session.duration_seconds = draft.duration_seconds;
        session.mode = draft.mode;
        session.category_ids = draft.category_ids.clone();
        session.direct_apps = draft.apps.clone();
        session.direct_websites = draft.websites.clone();
        session.resolved_apps = resolved_apps;
        session.resolved_websites = resolved_websites;
        session.ends_at = draft
            .duration_seconds
            .map(|seconds| now + ((seconds as i64 * 1000).saturating_sub(elapsed_active_ms)));
        session.clone()
    };
    save_and_emit(cx)?;
    enforce_active_session(cx);
    Ok(updated)
}

pub fn pause_session(cx: &BeamContext) -> Result<FocusSession> {
    let now = now_ms();
    let updated = {
        let mut state = FOCUS_STATE.write();
        let Some(session) = state.session.as_mut() else {
            return Err(FocusError::NoActiveSession);
        };
        if session.status == FocusSessionStatus::Running {
            session.status = FocusSessionStatus::Paused;
            session.paused_at = Some(now);
        }
        session.clone()
    };
    save_and_emit(cx)?;
    enforce_active_session(cx);
    Ok(updated)
}

pub fn resume_session(cx: &BeamContext) -> Result<FocusSession> {
    let now = now_ms();
    let updated = {
        let mut state = FOCUS_STATE.write();
        let Some(session) = state.session.as_mut() else {
            return Err(FocusError::NoActiveSession);
        };
        if session.status == FocusSessionStatus::Paused {
            if let Some(paused_at) = session.paused_at {
                let paused_ms = now.saturating_sub(paused_at);
                session.total_paused_ms += paused_ms;
                if let Some(ends_at) = session.ends_at.as_mut() {
                    *ends_at += paused_ms;
                }
            }
            session.status = FocusSessionStatus::Running;
            session.paused_at = None;
        }
        session.clone()
    };
    save_and_emit(cx)?;
    Ok(updated)
}

pub fn complete_session(cx: &BeamContext) -> Result<FocusSession> {
    let now = now_ms();
    let updated = {
        let mut state = FOCUS_STATE.write();
        let Some(session) = state.session.as_mut() else {
            return Err(FocusError::NoActiveSession);
        };
        session.status = FocusSessionStatus::Completed;
        session.completed_at = Some(now);
        session.paused_at = None;
        session.clone()
    };
    save_and_emit(cx)?;
    Ok(updated)
}

pub fn toggle_session(cx: &BeamContext) -> Result<Option<FocusSession>> {
    let current = FOCUS_STATE.read().session.clone();
    match current {
        Some(session) if session.status == FocusSessionStatus::Running => {
            pause_session(cx).map(Some)
        }
        Some(session) if session.status == FocusSessionStatus::Paused => {
            resume_session(cx).map(Some)
        }
        _ => {
            let draft = FOCUS_STATE.read().last_draft.clone();
            start_session(cx, draft).map(Some)
        }
    }
}

pub fn snooze(cx: &BeamContext, input: FocusSnoozeInput) -> Result<FocusSession> {
    let target = normalize_rule(&input.target).ok_or(FocusError::MissingSnoozeTarget)?;
    let duration_seconds = input.duration_seconds.clamp(60, 60 * 60 * 8);
    let now = now_ms();
    let updated = {
        let mut state = FOCUS_STATE.write();
        let Some(session) = state.session.as_mut() else {
            return Err(FocusError::NoActiveSession);
        };
        prune_expired_snoozes(session, now);
        session
            .snoozes
            .retain(|snooze| !(snooze.target_type == input.target_type && snooze.target == target));
        session.snoozes.push(FocusSnooze {
            id: nanoid::nanoid!(),
            target_type: input.target_type,
            target,
            expires_at: now + (duration_seconds as i64 * 1000),
        });
        session.clone()
    };
    save_and_emit(cx)?;
    Ok(updated)
}

pub fn browser_policy() -> FocusBrowserPolicy {
    let state = FOCUS_STATE.read();
    let now = now_ms();
    let Some(session) = state.session.as_ref() else {
        return FocusBrowserPolicy {
            active: false,
            paused: false,
            goal: None,
            mode: FocusSessionMode::Block,
            websites: Vec::new(),
            snoozed_websites: Vec::new(),
            ends_at: None,
            now,
        };
    };

    FocusBrowserPolicy {
        active: session.status == FocusSessionStatus::Running,
        paused: session.status == FocusSessionStatus::Paused,
        goal: Some(session.goal.clone()),
        mode: session.mode,
        websites: session.resolved_websites.clone(),
        snoozed_websites: session
            .snoozes
            .iter()
            .filter(|snooze| {
                snooze.target_type == FocusSnoozeTargetType::Website && snooze.expires_at > now
            })
            .cloned()
            .collect(),
        ends_at: session.ends_at,
        now,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::focus::types::{FocusCategoryKind, FocusSessionMode, FocusSessionStatus};

    #[test]
    fn sync_session_rules_prunes_missing_categories_and_recomputes_rules() {
        let categories = vec![FocusCategory {
            id: "keep".to_string(),
            title: "Keep".to_string(),
            apps: vec!["slack".to_string()],
            websites: vec!["x.com".to_string()],
            kind: FocusCategoryKind::Custom,
            created_at: 0,
            updated_at: 0,
        }];
        let mut session = FocusSession {
            id: "session".to_string(),
            goal: "Work".to_string(),
            duration_seconds: Some(1500),
            mode: FocusSessionMode::Block,
            category_ids: vec!["keep".to_string(), "missing".to_string()],
            direct_apps: vec!["steam".to_string()],
            direct_websites: vec!["reddit.com".to_string()],
            resolved_apps: vec!["old".to_string()],
            resolved_websites: vec!["old.com".to_string()],
            status: FocusSessionStatus::Running,
            started_at: 0,
            ends_at: Some(1_500_000),
            paused_at: None,
            total_paused_ms: 0,
            snoozes: Vec::new(),
            completed_at: None,
        };

        sync_session_rules(&mut session, &categories);

        assert_eq!(session.category_ids, vec!["keep"]);
        assert_eq!(session.resolved_apps, vec!["slack", "steam"]);
        assert_eq!(session.resolved_websites, vec!["reddit.com", "x.com"]);
    }
}
