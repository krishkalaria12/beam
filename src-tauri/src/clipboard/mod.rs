use std::{
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};

use arboard::Clipboard;
use tauri::{command, AppHandle};

use crate::{
    clipboard::{
        convert_image::get_image_as_base64,
        error::Result,
        history::{get_history, get_history_values, save_to_history, ClipboardHistoryEntry},
        search::search_history,
    },
    config::config,
};

pub mod convert_image;
pub mod error;
pub mod history;
pub mod password;
pub mod search;

static CLIPBOARD_LISTENER_RUNNING: AtomicBool = AtomicBool::new(false);

#[command]
pub fn get_clipboard_history(app: AppHandle) -> Result<Vec<String>> {
    get_history_values(&app)
}

#[command]
pub fn get_clipboard_history_entries(app: AppHandle) -> Result<Vec<ClipboardHistoryEntry>> {
    get_history(&app)
}

#[command]
pub fn search_clipboard_history(
    app: AppHandle,
    query: String,
) -> Result<Vec<ClipboardHistoryEntry>> {
    search_history(&app, &query)
}

pub fn start_clipboard_listener(app: AppHandle) {
    if CLIPBOARD_LISTENER_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn_blocking(move || {
        run_clipboard_listener(app);
        CLIPBOARD_LISTENER_RUNNING.store(false, Ordering::Release);
    });
}

fn run_clipboard_listener(app: AppHandle) {
    let poll_interval = Duration::from_millis(config().CLIPBOARD_POLL_INTERVAL_MS);
    let mut clipboard = match Clipboard::new() {
        Ok(clipboard) => clipboard,
        Err(err) => {
            eprintln!("beam: failed to initialize clipboard listener: {err}");
            return;
        }
    };

    let mut last_value = String::new();

    loop {
        if let Some(next_value) = read_clipboard_entry(&mut clipboard) {
            if next_value != last_value {
                match save_to_history(&app, next_value.clone()) {
                    Ok(()) => last_value = next_value,
                    Err(err) => eprintln!("beam: failed to store clipboard entry: {err}"),
                }
            }
        }

        thread::sleep(poll_interval);
    }
}

fn read_clipboard_entry(clipboard: &mut Clipboard) -> Option<String> {
    if let Ok(text) = clipboard.get_text() {
        let text = text.trim();

        if !text.is_empty() && text.len() <= config().CLIPBOARD_MAX_ENTRY_BYTES {
            return Some(text.to_string());
        }
    }

    if let Ok(image_data) = clipboard.get_image() {
        let image = get_image_as_base64(image_data)?;

        if image.len() <= config().CLIPBOARD_MAX_ENTRY_BYTES {
            return Some(image);
        }
    }

    None
}
