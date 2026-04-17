use tauri::{command, AppHandle};

use super::{app_entry::AppEntry, cache::get_applications as get_live_applications, error::Result};

#[command]
pub fn get_applications(app: AppHandle) -> Result<Vec<AppEntry>> {
    get_live_applications(app)
}
