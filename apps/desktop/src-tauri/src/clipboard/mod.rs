use std::{
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
use arboard::Clipboard;
use tauri::{command, AppHandle, State};

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
use self::convert_image::{get_image_as_base64, image_data_url_to_arboard_image};
use self::error::Result;
use self::history::{
    clear_history, get_history, get_history_values, get_pinned_entry_ids, remove_history_entry,
    save_to_history, set_entry_pinned, ClipboardHistoryEntry,
};
use self::search::search_history;

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;
#[cfg(target_os = "linux")]
use crate::linux_desktop;
#[cfg(target_os = "macos")]
use crate::macos;
use crate::state::AppState;
#[cfg(target_os = "windows")]
use crate::windows_desktop;

pub(crate) mod config;
pub mod convert_image;
pub mod db;
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
    pub image: Option<String>,
}

impl ClipboardContent {
    pub fn from_read_result(result: ReadResult) -> Self {
        let image = result
            .text
            .as_ref()
            .filter(|value| value.starts_with("data:image/"))
            .cloned();

        Self {
            text: if image.is_some() { None } else { result.text },
            html: result.html,
            file: result.file,
            image,
        }
    }
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
pub async fn get_clipboard_history(app: AppHandle) -> Result<Vec<String>> {
    get_history_values(&app).await
}

#[command]
pub async fn get_clipboard_history_entries(app: AppHandle) -> Result<Vec<ClipboardHistoryEntry>> {
    get_history(&app).await
}

#[command]
pub async fn search_clipboard_history(
    app: AppHandle,
    query: String,
) -> Result<Vec<ClipboardHistoryEntry>> {
    search_history(&app, &query).await
}

#[command]
pub async fn delete_clipboard_history_entry(
    app: AppHandle,
    copied_at: String,
    value: String,
) -> Result<()> {
    remove_history_entry(&app, copied_at, value).await
}

#[command]
pub async fn clear_clipboard_history(app: AppHandle) -> Result<()> {
    clear_history(&app).await
}

#[command]
pub async fn get_pinned_clipboard_entry_ids(app: AppHandle) -> Result<Vec<String>> {
    get_pinned_entry_ids(&app).await
}

#[command]
pub async fn set_clipboard_entry_pinned(
    app: AppHandle,
    copied_at: String,
    value: String,
    pinned: bool,
) -> Result<Vec<String>> {
    set_entry_pinned(&app, copied_at, value, pinned).await
}

#[command]
pub async fn get_selected_text(state: State<'_, AppState>) -> std::result::Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let _ = &state;
        return macos::clipboard::selected_text();
    }

    #[cfg(target_os = "linux")]
    {
        let snapshot = crate::desktop::context::get_desktop_context_snapshot(&state);
        return Ok(snapshot.selected_text.value.unwrap_or_default());
    }

    #[cfg(target_os = "windows")]
    {
        return Ok(windows_desktop::selection::capture_selected_text(&state));
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
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
    #[cfg(target_os = "macos")]
    {
        let _ = &state;
        return macos::clipboard::selected_files();
    }

    #[cfg(target_os = "linux")]
    {
        let snapshot = crate::desktop::context::get_desktop_context_snapshot(&state);
        return Ok(snapshot.selected_files.value.unwrap_or_default());
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
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

    #[cfg(target_os = "macos")]
    {
        return macos::clipboard::clipboard_read_text();
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
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

    #[cfg(target_os = "macos")]
    {
        return macos::clipboard::clipboard_read();
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
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

    #[cfg(target_os = "macos")]
    {
        return macos::clipboard::clipboard_copy(content, options);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
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
        } else if let Some(image) = &content.image {
            clipboard
                .set_image(image_data_url_to_arboard_image(image)?)
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn trigger_paste_shortcut() {
    #[cfg(target_os = "windows")]
    {
        crate::windows_desktop::input::send_paste_shortcut();
    }
}

#[command]
pub async fn clipboard_paste(content: ClipboardContent) -> std::result::Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::clipboard::clipboard_paste(content)
            .map_err(|error| error.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        return macos::clipboard::clipboard_paste(content);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        let original_clipboard = read_clipboard_entry(&mut clipboard).map(|text| ReadResult {
            text: Some(text),
            html: None,
            file: None,
        });

        clipboard_copy(content, None).await?;
        thread::sleep(Duration::from_millis(60));
        trigger_paste_shortcut();
        thread::sleep(Duration::from_millis(60));

        if let Some(snapshot) = original_clipboard {
            let _ = clipboard_copy(ClipboardContent::from_read_result(snapshot), None).await;
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

    #[cfg(target_os = "macos")]
    {
        return macos::clipboard::clipboard_clear();
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
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
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    let mut clipboard = match Clipboard::new() {
        Ok(clipboard) => clipboard,
        Err(err) => {
            eprintln!("beam: failed to initialize clipboard listener: {err}");
            return;
        }
    };

    #[cfg(target_os = "macos")]
    let mut last_change_count = macos::clipboard::current_change_count();

    let mut last_value = String::new();

    loop {
        #[cfg(target_os = "linux")]
        let next_value = read_linux_clipboard_entry();

        #[cfg(target_os = "macos")]
        let next_value = {
            let current = macos::clipboard::current_change_count();
            if current == last_change_count {
                None
            } else {
                last_change_count = current;
                macos::clipboard::read_history_entry()
            }
        };

        #[cfg(not(any(target_os = "linux", target_os = "macos")))]
        let next_value = read_clipboard_entry(&mut clipboard);

        if let Some(next_value) = next_value {
            if next_value != last_value {
                match tauri::async_runtime::block_on(save_to_history(&app, next_value.clone())) {
                    Ok(()) => last_value = next_value,
                    Err(err) => eprintln!("beam: failed to store clipboard entry: {err}"),
                }
            }
        }

        thread::sleep(poll_interval);
    }
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn read_clipboard_entry(clipboard: &mut Clipboard) -> Option<String> {
    if let Ok(text) = clipboard.get_text() {
        let text = text.trim();

        if !text.is_empty() {
            return Some(text.to_string());
        }
    }

    if let Ok(image_data) = clipboard.get_image() {
        return get_image_as_base64(image_data);
    }

    None
}

#[cfg(target_os = "linux")]
fn read_linux_clipboard_entry() -> Option<String> {
    let read_result = linux_desktop::clipboard::clipboard_read().ok()?;
    let text = read_result.text?;
    if text.starts_with("data:image/") {
        return Some(text);
    }

    let text = text.trim();
    if text.is_empty() {
        return None;
    }

    Some(text.to_string())
}
