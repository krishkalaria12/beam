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

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReadResult {
    text: Option<String>,
    html: Option<String>,
    file: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardContent {
    text: Option<String>,
    html: Option<String>,
    file: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CopyOptions {
    concealed: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFinderItem {
    path: String,
}

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

#[command]
pub async fn get_selected_text() -> std::result::Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    Ok(clipboard.get_text().unwrap_or_default())
}

#[command]
pub async fn get_selected_finder_items() -> std::result::Result<Vec<SelectedFinderItem>, String> {
    Ok(Vec::new())
}

#[command]
pub async fn clipboard_read_text() -> std::result::Result<ReadResult, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let text = clipboard.get_text().ok();

    Ok(ReadResult {
        text,
        html: None,
        file: None,
    })
}

#[command]
pub async fn clipboard_read() -> std::result::Result<ReadResult, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let text = clipboard.get_text().ok();

    let file = if let Some(ref text_content) = text {
        if text_content.lines().count() == 1
            && (text_content.starts_with('/') || text_content.starts_with("file://"))
        {
            Some(text_content.clone())
        } else {
            None
        }
    } else {
        None
    };

    Ok(ReadResult {
        text,
        html: None,
        file,
    })
}

#[command]
pub async fn clipboard_copy(
    content: ClipboardContent,
    _options: Option<CopyOptions>,
) -> std::result::Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

    if let Some(file_path) = &content.file {
        clipboard
            .set_text(file_path.clone())
            .map_err(|e| e.to_string())?;
    } else if let Some(text) = &content.text {
        clipboard.set_text(text.clone()).map_err(|e| e.to_string())?;
    } else if let Some(html) = &content.html {
        // arboard has no HTML channel; degrade to plain text.
        clipboard.set_text(html.clone()).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn trigger_paste_shortcut() {
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdotool")
            .args(["key", "ctrl+v"])
            .status();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("osascript")
            .args([
                "-e",
                "tell application \"System Events\" to keystroke \"v\" using command down",
            ])
            .status();
    }

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')",
            ])
            .status();
    }
}

#[command]
pub async fn clipboard_paste(content: ClipboardContent) -> std::result::Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let original_text = clipboard.get_text().ok();

    clipboard_copy(content, None).await?;
    thread::sleep(Duration::from_millis(60));
    trigger_paste_shortcut();
    thread::sleep(Duration::from_millis(60));

    if let Some(text) = original_text {
        let _ = clipboard.set_text(text);
    } else {
        let _ = clipboard.clear();
    }

    Ok(())
}

#[command]
pub async fn clipboard_clear() -> std::result::Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.clear().map_err(|e| e.to_string())
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
