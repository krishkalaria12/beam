use tauri::{command, Window};

use crate::search::error::{Error, Result};

pub mod error;

#[command]
pub fn search_with_browser(window: Window, site: String, query: String) -> Result<()> {
    let url = match site.as_str() {
        "google" => format!("https://www.google.com/search?q={}", query),
        "duckduckgo" => format!("https://duckduckgo.com/?q={}", query),
        _ => format!("https://www.google.com/search?q={}", query),
    };

    if webbrowser::open(&url).is_err() {
        return Err(Error::FailedToOpenBrowserError(
            "Could not open browser".into(),
        ));
    }

    window
        .hide()
        .map_err(|e| Error::HidingWindowApplicationError(e.to_string()))?;

    Ok(())
}
