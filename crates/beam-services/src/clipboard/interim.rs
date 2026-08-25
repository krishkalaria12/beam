//! Interim macOS clipboard surface: arboard text channel only.
//!
//! TODO(PORT: apps/desktop/src-tauri/src/macos/clipboard.rs): the real
//! backend (NSPasteboard via objc2 — HTML and file channels, selected-text
//! and selected-files readers, change-count listener) lands with lane A5
//! and replaces every function here. The signatures match the final
//! backend's so the swap is mechanical.

use arboard::Clipboard;

use super::{ClipboardContent, ReadResult};

pub fn selected_text() -> std::result::Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    Ok(clipboard.get_text().unwrap_or_default())
}

pub fn selected_files() -> std::result::Result<Vec<super::SelectedFinderItem>, String> {
    Err("get_selected_finder_items is not supported by the interim clipboard backend".to_string())
}

pub fn clipboard_read_text() -> std::result::Result<ReadResult, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let text = clipboard.get_text().ok();
    Ok(ReadResult {
        text,
        html: None,
        file: None,
    })
}

pub fn clipboard_read() -> std::result::Result<ReadResult, String> {
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

pub fn clipboard_copy(content: ClipboardContent) -> std::result::Result<(), String> {
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
            .set_image(super::convert_image::image_data_url_to_arboard_image(
                image,
            )?)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub async fn clipboard_paste(content: ClipboardContent) -> std::result::Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let original_clipboard = clipboard.get_text().ok().map(|text| ReadResult {
        text: Some(text),
        html: None,
        file: None,
    });

    clipboard_copy(content)?;
    std::thread::sleep(std::time::Duration::from_millis(60));
    // The real backend triggers the paste keystroke through the
    // Accessibility API; the interim cannot, so the content is only staged
    // on the pasteboard.
    log::debug!("clipboard_paste: keystroke injection pending lane A5");
    std::thread::sleep(std::time::Duration::from_millis(60));

    if let Some(snapshot) = original_clipboard {
        let _ = clipboard_copy(ClipboardContent::from_read_result(snapshot));
    } else {
        let _ = clipboard.clear();
    }

    Ok(())
}

pub fn clipboard_clear() -> std::result::Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.clear().map_err(|e| e.to_string())
}

/// Polls the pasteboard for the history listener (text channel only).
pub fn read_history_entry() -> Option<String> {
    let mut clipboard = Clipboard::new().ok()?;
    let text = clipboard.get_text().ok()?;
    let text = text.trim();

    if text.is_empty() {
        return None;
    }

    Some(text.to_string())
}
