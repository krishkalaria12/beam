// PORT: apps/desktop/src-tauri/src/applications/find_app.rs

use beam_core::BeamContext;

use super::{app_entry::AppEntry, cache::get_applications as get_live_applications, error::Result};

pub fn get_applications(cx: &BeamContext) -> Result<Vec<AppEntry>> {
    get_live_applications(cx)
}
