mod enforcement;
mod error;
mod rules;
mod runtime;
mod store;
mod time;
pub mod types;

use tauri::{command, AppHandle};

pub use runtime::{browser_policy, initialize, FOCUS_APP_BLOCKED_EVENT, FOCUS_STATUS_EVENT};
use types::{
    FocusCategory, FocusCategoryInput, FocusSession, FocusSessionDraft, FocusSnoozeInput,
    FocusStatus,
};

use self::error::Result;

#[command]
pub fn get_focus_status(app: AppHandle) -> FocusStatus {
    runtime::get_status(&app)
}

#[command]
pub fn create_focus_category(app: AppHandle, input: FocusCategoryInput) -> Result<FocusCategory> {
    runtime::create_category(&app, input)
}

#[command]
pub fn update_focus_category(
    app: AppHandle,
    id: String,
    input: FocusCategoryInput,
) -> Result<FocusCategory> {
    runtime::update_category(&app, id, input)
}

#[command]
pub fn delete_focus_category(app: AppHandle, id: String) -> Result<()> {
    runtime::delete_category(&app, id)
}

#[command]
pub fn import_focus_categories(app: AppHandle, payload: String) -> Result<Vec<FocusCategory>> {
    runtime::import_categories(&app, payload)
}

#[command]
pub fn start_focus_session(app: AppHandle, draft: FocusSessionDraft) -> Result<FocusSession> {
    runtime::start_session(&app, draft)
}

#[command]
pub fn edit_focus_session(app: AppHandle, draft: FocusSessionDraft) -> Result<FocusSession> {
    runtime::edit_session(&app, draft)
}

#[command]
pub fn pause_focus_session(app: AppHandle) -> Result<FocusSession> {
    runtime::pause_session(&app)
}

#[command]
pub fn resume_focus_session(app: AppHandle) -> Result<FocusSession> {
    runtime::resume_session(&app)
}

#[command]
pub fn complete_focus_session(app: AppHandle) -> Result<FocusSession> {
    runtime::complete_session(&app)
}

#[command]
pub fn toggle_focus_session(app: AppHandle) -> Result<Option<FocusSession>> {
    runtime::toggle_session(&app)
}

#[command]
pub fn snooze_focus_target(app: AppHandle, input: FocusSnoozeInput) -> Result<FocusSession> {
    runtime::snooze(&app, input)
}
