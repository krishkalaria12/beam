use tauri::{command, AppHandle};

use super::{app_entry::AppEntry, cache::get_applications_with_cache, error::Result};

use crate::fuzzy_search::fuzzy_match_applications;

const MAX_SEARCH_RESULTS: usize = 50;

#[command]
pub fn search_applications(app: AppHandle, query: String) -> Result<Vec<AppEntry>> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let applications = get_applications_with_cache(app)?;
    Ok(fuzzy_match_applications(
        applications,
        normalized_query,
        MAX_SEARCH_RESULTS,
    ))
}
