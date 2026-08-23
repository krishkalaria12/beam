use std::thread;
use std::time::Duration;

use arboard::Clipboard;

use crate::state::AppState;

use super::{input, window_manager};

const COPY_SETTLE_DELAY: Duration = Duration::from_millis(140);
const RESTORE_SETTLE_DELAY: Duration = Duration::from_millis(60);

/// Captures the currently selected text in the foreground application by
/// simulating Ctrl+C and reading the clipboard. The previous clipboard text
/// content is restored afterwards.
pub fn capture_selected_text(state: &AppState) -> String {
    let foreground = match window_manager::frontmost_window(state) {
        Ok(frontmost) => frontmost,
        Err(_) => None,
    };
    let Some(foreground) = foreground else {
        return String::new();
    };

    // Never treat our own launcher as the source of a selection.
    if foreground.app_name.eq_ignore_ascii_case("beam") {
        return String::new();
    }

    let mut clipboard = match Clipboard::new() {
        Ok(clipboard) => clipboard,
        Err(error) => {
            log::warn!("windows selection: clipboard unavailable: {error}");
            return String::new();
        }
    };

    let previous_text = clipboard.get_text().ok();

    input::send_copy_shortcut();
    thread::sleep(COPY_SETTLE_DELAY);

    let selected = clipboard.get_text().unwrap_or_default();

    if let Some(previous) = previous_text {
        thread::sleep(Duration::from_millis(10));
        if clipboard.set_text(previous).is_ok() {
            thread::sleep(RESTORE_SETTLE_DELAY);
        }
    }

    let trimmed_start = selected.trim_start();
    if trimmed_start.is_empty() {
        return String::new();
    }

    selected.trim().to_string()
}
