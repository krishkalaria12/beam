pub mod error;

// PORT: apps/desktop/src-tauri/src/search/mod.rs
// The Window parameter went away with the webview: opening the browser is
// the service's job; hiding the launcher afterwards belongs to the command
// dispatcher in beam-app, which owns the window.

use self::error::{Result, SearchError};

pub fn search_with_browser(site: &str, query: &str) -> Result<()> {
    let url = match site {
        "google" => format!("https://www.google.com/search?q={}", query),
        "duckduckgo" => format!("https://duckduckgo.com/?q={}", query),
        _ => format!("https://www.google.com/search?q={}", query),
    };

    if webbrowser::open(&url).is_err() {
        return Err(SearchError::FailedToOpenBrowserError(
            "Could not open browser".into(),
        ));
    }

    Ok(())
}
