use tauri::{command, AppHandle};

use super::{app_entry::AppEntry, cache::get_applications_with_cache, error::Result};

#[command]
pub fn get_applications(app: AppHandle) -> Result<Vec<AppEntry>> {
    get_applications_with_cache(app)
}
