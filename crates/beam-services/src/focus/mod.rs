mod enforcement;
mod error;
mod rules;
mod runtime;
mod store;
mod time;
pub mod types;

// PORT: apps/desktop/src-tauri/src/focus/mod.rs
// Command attributes deleted; AppHandle became &BeamContext.

use beam_core::BeamContext;

pub use runtime::{browser_policy, initialize, FOCUS_APP_BLOCKED_EVENT, FOCUS_STATUS_EVENT};
use types::{
    FocusCategory, FocusCategoryInput, FocusSession, FocusSessionDraft, FocusSnoozeInput,
    FocusStatus,
};

use self::error::Result;

pub fn get_focus_status(_cx: &BeamContext) -> FocusStatus {
    runtime::get_status()
}

pub fn create_focus_category(cx: &BeamContext, input: FocusCategoryInput) -> Result<FocusCategory> {
    runtime::create_category(cx, input)
}

pub fn update_focus_category(
    cx: &BeamContext,
    id: String,
    input: FocusCategoryInput,
) -> Result<FocusCategory> {
    runtime::update_category(cx, id, input)
}

pub fn delete_focus_category(cx: &BeamContext, id: String) -> Result<()> {
    runtime::delete_category(cx, id)
}

pub fn import_focus_categories(cx: &BeamContext, payload: String) -> Result<Vec<FocusCategory>> {
    runtime::import_categories(cx, payload)
}

pub fn start_focus_session(cx: &BeamContext, draft: FocusSessionDraft) -> Result<FocusSession> {
    runtime::start_session(cx, draft)
}

pub fn edit_focus_session(cx: &BeamContext, draft: FocusSessionDraft) -> Result<FocusSession> {
    runtime::edit_session(cx, draft)
}

pub fn pause_focus_session(cx: &BeamContext) -> Result<FocusSession> {
    runtime::pause_session(cx)
}

pub fn resume_focus_session(cx: &BeamContext) -> Result<FocusSession> {
    runtime::resume_session(cx)
}

pub fn complete_focus_session(cx: &BeamContext) -> Result<FocusSession> {
    runtime::complete_session(cx)
}

pub fn toggle_focus_session(cx: &BeamContext) -> Result<Option<FocusSession>> {
    runtime::toggle_session(cx)
}

pub fn snooze_focus_target(cx: &BeamContext, input: FocusSnoozeInput) -> Result<FocusSession> {
    runtime::snooze(cx, input)
}
