use tauri::{command, Window};

pub mod error;

use self::error::{Result, SearchError};

#[command]
pub fn search_with_browser(window: Window, site: String, query: String) -> Result<()> {
    let url = match site.as_str() {
        "google" => format!("https://www.google.com/search?q={}", query),
        "duckduckgo" => format!("https://duckduckgo.com/?q={}", query),
        _ => format!("https://www.google.com/search?q={}", query),
    };

    if webbrowser::open(&url).is_err() {
        return Err(SearchError::FailedToOpenBrowserError(
            "Could not open browser".into(),
        ));
    }

    crate::launcher_window::hide_launcher_window_with_reset(&window)
        .map_err(SearchError::HidingWindowApplicationError)?;

    Ok(())
}
