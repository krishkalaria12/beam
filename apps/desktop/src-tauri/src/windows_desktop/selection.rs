use std::thread;
use std::time::{Duration, Instant};

use arboard::Clipboard;

use crate::state::AppState;

use super::{input, window_manager};

const COPY_POLL_INTERVAL: Duration = Duration::from_millis(50);
const COPY_MAX_WAIT: Duration = Duration::from_millis(600);
const RESTORE_SETTLE_DELAY: Duration = Duration::from_millis(60);

/// Waits for the simulated Ctrl+C to land by polling until the clipboard
/// content differs from what was there before. Slow applications get up to
/// `COPY_MAX_WAIT` instead of a fixed guess; apps that never respond to the
/// chord simply pay the timeout.
fn read_copied_text(clipboard: &mut Clipboard, previous_text: Option<&str>) -> String {
    let deadline = Instant::now() + COPY_MAX_WAIT;

    while Instant::now() < deadline {
        thread::sleep(COPY_POLL_INTERVAL);
        if let Ok(text) = clipboard.get_text() {
            let changed = match previous_text {
                Some(previous) => text != previous,
                None => !text.trim().is_empty(),
            };
            if changed {
                return text;
            }
        }
    }

    clipboard.get_text().unwrap_or_default()
}

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

    let selected = read_copied_text(&mut clipboard, previous_text.as_deref());

    if let Some(previous) = previous_text {
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
