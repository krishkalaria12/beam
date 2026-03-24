use std::{
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};

#[cfg(not(target_os = "linux"))]
use arboard::Clipboard;
use tauri::{command, AppHandle, State};

#[cfg(not(target_os = "linux"))]
use self::convert_image::get_image_as_base64;
use self::error::Result;
use self::history::{
    clear_history, get_history, get_history_values, get_pinned_entry_ids, remove_history_entry,
    save_to_history, set_entry_pinned, ClipboardHistoryEntry,
};
use self::search::search_history;

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;
#[cfg(target_os = "linux")]
use crate::linux_desktop;
#[cfg(target_os = "linux")]
use crate::state::AppState;

pub(crate) mod config;
pub mod convert_image;
pub mod error;
pub mod history;
pub mod password;
pub mod search;

static CLIPBOARD_LISTENER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReadResult {
    pub text: Option<String>,
    pub html: Option<String>,
    pub file: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardContent {
    pub text: Option<String>,
    pub html: Option<String>,
    pub file: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CopyOptions {
    pub concealed: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFinderItem {
    pub path: String,
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
pub fn delete_clipboard_history_entry(
    app: AppHandle,
    copied_at: String,
    value: String,
) -> Result<()> {
    remove_history_entry(&app, copied_at, value)
}

#[command]
pub fn clear_clipboard_history(app: AppHandle) -> Result<()> {
    clear_history(&app)
}

#[command]
pub fn get_pinned_clipboard_entry_ids(app: AppHandle) -> Result<Vec<String>> {
    get_pinned_entry_ids(&app)
}

#[command]
pub fn set_clipboard_entry_pinned(
    app: AppHandle,
    copied_at: String,
    value: String,
    pinned: bool,
) -> Result<Vec<String>> {
    set_entry_pinned(&app, copied_at, value, pinned)
}

#[command]
pub async fn get_selected_text(state: State<'_, AppState>) -> std::result::Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let snapshot = linux_desktop::context::get_desktop_context_snapshot(&state);
        return Ok(snapshot.selected_text.value.unwrap_or_default());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = state;
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        Ok(clipboard.get_text().unwrap_or_default())
    }
}

#[command]
pub async fn get_selected_finder_items(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<SelectedFinderItem>, String> {
    #[cfg(target_os = "linux")]
    {
        let snapshot = linux_desktop::context::get_desktop_context_snapshot(&state);
        return Ok(snapshot.selected_files.value.unwrap_or_default());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = state;
        Err("get_selected_finder_items is not supported on this platform in Beam yet".to_string())
    }
}

#[command]
pub async fn clipboard_read_text() -> std::result::Result<ReadResult, String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_read_text().map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        let text = clipboard.get_text().ok();

        Ok(ReadResult {
            text,
            html: None,
            file: None,
        })
    }
}

#[command]
pub async fn clipboard_read() -> std::result::Result<ReadResult, String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_read().map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
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
}

#[command]
pub async fn clipboard_copy(
    content: ClipboardContent,
    options: Option<CopyOptions>,
) -> std::result::Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_copy(content, options)
            .map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

        if let Some(file_path) = &content.file {
            clipboard
                .set_text(file_path.clone())
                .map_err(|e| e.to_string())?;
        } else if let Some(text) = &content.text {
            clipboard
                .set_text(text.clone())
                .map_err(|e| e.to_string())?;
        } else if let Some(html) = &content.html {
            // arboard has no HTML channel; degrade to plain text.
            clipboard
                .set_text(html.clone())
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}

#[cfg(not(target_os = "linux"))]
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
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_paste(content)
            .map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
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
}

#[command]
pub async fn clipboard_clear() -> std::result::Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_clear().map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.clear().map_err(|e| e.to_string())
    }
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
    let poll_interval = Duration::from_millis(CLIPBOARD_CONFIG.poll_interval_ms);
    #[cfg(not(target_os = "linux"))]
    let mut clipboard = match Clipboard::new() {
        Ok(clipboard) => clipboard,
        Err(err) => {
            eprintln!("beam: failed to initialize clipboard listener: {err}");
            return;
        }
    };

    let mut last_value = String::new();

    loop {
        #[cfg(target_os = "linux")]
        let next_value = read_linux_clipboard_entry();
        #[cfg(not(target_os = "linux"))]
        let next_value = read_clipboard_entry(&mut clipboard);

        if let Some(next_value) = next_value {
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

#[cfg(not(target_os = "linux"))]
fn read_clipboard_entry(clipboard: &mut Clipboard) -> Option<String> {
    if let Ok(text) = clipboard.get_text() {
        let text = text.trim();

        if !text.is_empty() && text.len() <= CLIPBOARD_CONFIG.max_entry_bytes {
            return Some(text.to_string());
        }
    }

    if let Ok(image_data) = clipboard.get_image() {
        let image = get_image_as_base64(image_data)?;

        if image.len() <= CLIPBOARD_CONFIG.max_entry_bytes {
            return Some(image);
        }
    }

    None
}

#[cfg(target_os = "linux")]
fn read_linux_clipboard_entry() -> Option<String> {
    let read_result = linux_desktop::clipboard::clipboard_read().ok()?;
    let text = read_result.text?;
    let text = text.trim();
    if text.is_empty() || text.len() > CLIPBOARD_CONFIG.max_entry_bytes {
        return None;
    }
    Some(text.to_string())
}
