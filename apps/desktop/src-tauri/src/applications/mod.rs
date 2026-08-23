pub mod app_entry;
pub mod cache;
pub mod collector;
pub(crate) mod config;
pub mod error;
pub mod find_app;
#[cfg(target_os = "linux")]
pub mod icon_resolver;
pub mod open_app;
pub mod raycast_compat;
pub mod search;

use self::app_entry::{AppEntry, SearchableAppEntry};
use crate::applications::error::Result;

/// Platform-dispatched application collection used by the cache layer.
pub fn collect_searchable_applications(
    selected_icon_theme: Option<String>,
) -> Result<Vec<SearchableAppEntry>> {
    #[cfg(target_os = "linux")]
    {
        return collector::collect_searchable_applications(selected_icon_theme);
    }

    #[cfg(target_os = "macos")]
    {
        return crate::macos::applications::collect_searchable_applications(selected_icon_theme);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = selected_icon_theme;
        Ok(Vec::new())
    }
}

/// Platform-dispatched public application listing.
pub fn collect_applications(selected_icon_theme: Option<String>) -> Result<Vec<AppEntry>> {
    Ok(collect_searchable_applications(selected_icon_theme)?
        .into_iter()
        .map(|entry| entry.into_public_entry())
        .collect())
}
