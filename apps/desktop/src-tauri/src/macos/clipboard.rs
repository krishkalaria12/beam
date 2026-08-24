//! NSPasteboard-backed clipboard provider for macOS.
//!
//! Mirrors the `linux_desktop::clipboard` public surface so the shared
//! command layer can dispatch per-platform with identical serde shapes:
//! text/HTML/file/image reads and writes, paste simulation, selected text,
//! and Finder selection.

use std::path::{Path, PathBuf};

use objc2::rc::Retained;
use objc2_app_kit::NSPasteboard;
use objc2_foundation::{NSString, NSURL};

use super::ax;
use crate::clipboard::{ClipboardContent, CopyOptions, ReadResult, SelectedFinderItem};
use crate::desktop::types::{ClipboardBackendCapabilities, DesktopBackendKind};

pub type ProviderResult<T> = std::result::Result<T, String>;

const TYPE_TEXT: &str = "public.utf8-plain-text";
const TYPE_HTML: &str = "public.html";
const TYPE_PNG: &str = "public.png";

pub fn active_backend_kind() -> DesktopBackendKind {
    DesktopBackendKind::MacosPasteboard
}

pub fn active_capabilities() -> ClipboardBackendCapabilities {
    if super::window_manager::ax_trusted() {
        ClipboardBackendCapabilities::full()
    } else {
        ClipboardBackendCapabilities {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: true,
            supports_selected_text: false,
            supports_selected_file_items: false,
        }
    }
}

pub fn selected_text_backend_name() -> String {
    "accessibility".to_string()
}

pub fn selected_files_backend_name() -> String {
    "finder-accessibility".to_string()
}

fn ns_type(uti: &str) -> Retained<NSString> {
    // NSPasteboardType is a plain NSString typedef; UTI strings bridge 1:1.
    NSString::from_str(uti)
}

/// Monotonic counter incremented on every pasteboard write.
pub fn current_change_count() -> isize {
    NSPasteboard::generalPasteboard().changeCount()
}

fn types_of_pasteboard(pasteboard: &NSPasteboard) -> Vec<String> {
    let Some(types) = pasteboard.types() else {
        return Vec::new();
    };
    types.iter().map(|t| t.to_string()).collect()
}

#[allow(dead_code)]
fn has_type(pasteboard: &NSPasteboard, uti: &str) -> bool {
    types_of_pasteboard(pasteboard)
        .iter()
        .any(|value| value == uti || value == format!("Apple {uti}").as_str())
}

fn data_for_type(pasteboard: &NSPasteboard, uti: &str) -> Option<Vec<u8>> {
    let data = pasteboard.dataForType(&ns_type(uti))?;
    Some(data.to_vec())
}

fn string_for_type(pasteboard: &NSPasteboard, uti: &str) -> Option<String> {
    let value = pasteboard.stringForType(&ns_type(uti))?;
    Some(value.to_string())
}

fn file_urls_from_pasteboard(pasteboard: &NSPasteboard) -> Vec<String> {
    let mut paths = Vec::new();

    // Modern route: readObjectsForClasses with NSURL decodes every
    // public.file-url entry regardless of the payload's plist encoding.
    unsafe {
        let nsurl_class: &objc2::runtime::AnyClass = objc2::class!(NSURL);
        let classes: objc2::rc::Retained<objc2_foundation::NSArray<objc2::runtime::AnyClass>> =
            objc2::msg_send![objc2::class!(NSArray), arrayWithObject:nsurl_class];
        if let Some(objects) = pasteboard.readObjectsForClasses_options(&classes, None) {
            for object in objects.iter() {
                if let Some(url) = object.downcast_ref::<NSURL>() {
                    if let Some(path) = url.path() {
                        paths.push(path.to_string());
                    }
                }
            }
        }
    }

    if !paths.is_empty() {
        return paths;
    }

    // Legacy fallback: NSFilenamesPboardType is a (possibly binary) plist
    // array of POSIX paths.
    if let Some(data) = data_for_type(pasteboard, "NSFilenamesPboardType") {
        if let Ok(plist::Value::Array(items)) =
            plist::Value::from_reader(std::io::Cursor::new(&data))
        {
            for item in items {
                if let plist::Value::String(path) = item {
                    paths.push(path);
                }
            }
        }
        if !paths.is_empty() {
            return paths;
        }
    }

    // Last resort: a lone public.file-url string.
    if let Some(text) = string_for_type(pasteboard, "public.file-url") {
        if let Some(path) = file_url_to_path(&text) {
            return vec![path];
        }
    }

    paths
}

fn file_url_to_path(url: &str) -> Option<String> {
    let ns_url = NSURL::URLWithString(&NSString::from_str(url))?;
    ns_url.path().map(|path| path.to_string())
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

pub fn clipboard_read_text() -> ProviderResult<ReadResult> {
    let pasteboard = NSPasteboard::generalPasteboard();
    let text = string_for_type(&pasteboard, TYPE_TEXT);
    let html = string_for_type(&pasteboard, TYPE_HTML);

    Ok(ReadResult {
        text,
        html: html.filter(|value| !value.trim().is_empty()),
        file: None,
    })
}

pub fn clipboard_read() -> ProviderResult<ReadResult> {
    let pasteboard = NSPasteboard::generalPasteboard();

    let files = file_urls_from_pasteboard(&pasteboard);
    let file = files.first().cloned();

    if let Some(first_path) = file.as_ref().filter(|_| files.len() == 1) {
        let path = PathBuf::from(first_path);
        if is_image_path(&path) {
            if let Some(data_url) = image_data_url(&path) {
                return Ok(ReadResult {
                    text: Some(data_url),
                    html: None,
                    file: None,
                });
            }
        }
    }

    let text = string_for_type(&pasteboard, TYPE_TEXT);
    let html = string_for_type(&pasteboard, TYPE_HTML);

    Ok(ReadResult {
        text,
        html: html.filter(|value| !value.trim().is_empty()),
        file,
    })
}

fn is_image_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp")
    )
}

fn image_data_url(path: &Path) -> Option<String> {
    let bytes = std::fs::read(path).ok()?;
    let mime = match path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        _ => return None,
    };
    use base64::Engine as _;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Some(format!("data:{mime};base64,{encoded}"))
}

/// Produces the history-ready string for a pasteboard change:
/// - single image files become data URLs,
/// - file copies become newline-separated paths,
/// - otherwise plain text.
pub fn read_history_entry() -> Option<String> {
    let pasteboard = NSPasteboard::generalPasteboard();

    let files = file_urls_from_pasteboard(&pasteboard);
    if files.len() == 1 {
        let path = PathBuf::from(&files[0]);
        if is_image_path(&path) {
            if let Some(data_url) = image_data_url(&path) {
                return Some(data_url);
            }
        }
        return Some(files[0].clone());
    }
    if files.len() > 1 {
        return Some(files.join("\n"));
    }

    let text = string_for_type(&pasteboard, TYPE_TEXT)?;
    let trimmed = text.trim_end();
    if trimmed.trim().is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

unsafe fn write_file_paths(pasteboard: &NSPasteboard, paths: &[String]) -> ProviderResult<()> {
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::NSPasteboardWriting;

    let urls: Vec<Retained<NSURL>> = paths
        .iter()
        .map(|path| {
            let cleaned = path.strip_prefix("file://").unwrap_or(path);
            NSURL::fileURLWithPath(&NSString::from_str(cleaned))
        })
        .collect();

    // NSURL conforms to NSPasteboardWriting on the ObjC side; the Rust
    // bindings cannot express that cross-crate conformance, so bridge it.
    let writers: Vec<Retained<ProtocolObject<dyn NSPasteboardWriting>>> = urls
        .into_iter()
        .map(ProtocolObject::from_retained)
        .collect();
    let array = objc2_foundation::NSArray::from_retained_slice(&writers);

    if pasteboard.writeObjects(&array) {
        Ok(())
    } else {
        Err("failed to write file URLs to the pasteboard".to_string())
    }
}

pub fn clipboard_copy(
    content: ClipboardContent,
    _options: Option<CopyOptions>,
) -> ProviderResult<()> {
    unsafe {
        let pasteboard = NSPasteboard::generalPasteboard();
        pasteboard.clearContents();

        // File payloads take priority when the caller passes an absolute path.
        if let Some(file_path) = content.file.as_deref().filter(|v| v.starts_with('/')) {
            return write_file_paths(&pasteboard, std::slice::from_ref(&file_path.to_string()));
        }

        if let Some(text) = content.text.as_deref() {
            pasteboard.setString_forType(&NSString::from_str(text), &ns_type(TYPE_TEXT));
            return Ok(());
        }

        if let Some(html) = content.html.as_deref() {
            pasteboard.setString_forType(&NSString::from_str(html), &ns_type(TYPE_HTML));
            return Ok(());
        }

        if let Some(image) = content.image.as_deref() {
            return write_image_data_url(&pasteboard, image);
        }
    }

    Ok(())
}

unsafe fn write_image_data_url(pasteboard: &NSPasteboard, data_url: &str) -> ProviderResult<()> {
    use base64::Engine as _;

    const PREFIX: &str = "base64,";
    let Some(index) = data_url.find(PREFIX) else {
        return Err("image payload is not a base64 data URL".to_string());
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data_url[index + PREFIX.len()..])
        .map_err(|e| e.to_string())?;

    let data = objc2_foundation::NSData::with_bytes(&bytes);
    if !pasteboard.setData_forType(Some(&data), &ns_type(TYPE_PNG)) {
        return Err("failed to write PNG to the pasteboard".to_string());
    }
    Ok(())
}

pub fn clipboard_clear() -> ProviderResult<()> {
    NSPasteboard::generalPasteboard().clearContents();

    Ok(())
}

/// Writes content and simulates Cmd+V into the frontmost application.
pub fn clipboard_paste(content: ClipboardContent) -> ProviderResult<()> {
    let previous = clipboard_read().ok();

    clipboard_copy(content, None)?;

    std::thread::sleep(std::time::Duration::from_millis(80));
    super::events::post_paste_keystroke();
    std::thread::sleep(std::time::Duration::from_millis(120));

    if let Some(previous) = previous {
        let _ = clipboard_copy(ClipboardContent::from_read_result(previous), None);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Selection (Accessibility-backed)
// ---------------------------------------------------------------------------

pub fn selected_text() -> ProviderResult<String> {
    if !super::window_manager::ax_trusted() {
        return Err("accessibility permission is required to read selected text".to_string());
    }

    unsafe {
        let system_wide = ax::AXUIElementCreateSystemWide();
        if system_wide.is_null() {
            return Err("failed to create system-wide accessibility element".to_string());
        }

        let mut result = ax::ax_copy_string(system_wide, ax::kAXSelectedTextAttribute);
        ax::ax_release(system_wide as _);

        if result.as_deref().unwrap_or_default().trim().is_empty() {
            // Fall back to the focused element of the focused application.
            if let Some(frontmost) = super::workspace::frontmost_regular_app() {
                let app_element = ax::AXUIElementCreateApplication(frontmost.pid);
                if !app_element.is_null() {
                    if let Some(focused_value) =
                        ax::ax_copy_value(app_element, ax::kAXFocusedUIElementAttribute)
                    {
                        let focused = focused_value as ax::AXUIElementRef;
                        result = ax::ax_copy_string(focused, ax::kAXSelectedTextAttribute);
                        ax::ax_release(focused_value);
                    }
                    ax::ax_release(app_element as _);
                }
            }
        }

        Ok(result.unwrap_or_default())
    }
}

pub fn selected_files() -> ProviderResult<Vec<SelectedFinderItem>> {
    if !super::window_manager::ax_trusted() {
        return Err("accessibility permission is required to read Finder selection".to_string());
    }

    unsafe {
        let Some(frontmost) = super::workspace::frontmost_regular_app() else {
            return Ok(Vec::new());
        };
        if frontmost.bundle_id != "com.apple.finder" {
            return Ok(Vec::new());
        }

        let app_element = ax::AXUIElementCreateApplication(frontmost.pid);
        if app_element.is_null() {
            return Ok(Vec::new());
        }

        let mut items = Vec::new();

        if let Some(windows_value) = ax::ax_copy_value(app_element, ax::kAXWindowsAttribute) {
            let array = windows_value as core_foundation_sys::array::CFArrayRef;
            let count = core_foundation_sys::array::CFArrayGetCount(array);
            for index in 0..count {
                let window = core_foundation_sys::array::CFArrayGetValueAtIndex(array, index)
                    as ax::AXUIElementRef;
                if let Some(selected) = ax::ax_copy_value(window, ax::kAXSelectedObjectsAttribute) {
                    collect_selected_paths(selected, &mut items);
                    ax::ax_release(selected);
                }
            }
            ax::ax_release(windows_value);
        }

        ax::ax_release(app_element as _);

        items.sort();
        items.dedup();
        Ok(items
            .into_iter()
            .map(|path| SelectedFinderItem { path })
            .collect())
    }
}

unsafe fn collect_selected_paths(
    selected_value: core_foundation::base::CFTypeRef,
    out: &mut Vec<String>,
) {
    let type_id = core_foundation_sys::base::CFGetTypeID(selected_value);
    let array_type_id = core_foundation_sys::array::CFArrayGetTypeID();

    if type_id == array_type_id {
        let array = selected_value as core_foundation_sys::array::CFArrayRef;
        let count = core_foundation_sys::array::CFArrayGetCount(array);
        for index in 0..count {
            collect_selected_paths(
                core_foundation_sys::array::CFArrayGetValueAtIndex(array, index),
                out,
            );
        }
        return;
    }

    let element = selected_value as ax::AXUIElementRef;
    if let Some(url_value) = ax::ax_copy_value(element, ax::kAXURLAttribute) {
        // kAXURLAttribute returns a CFURLRef (+1 retained), toll-free bridged
        // to NSURL; Retained::from_raw consumes that reference.
        if let Some(url) = Retained::<NSURL>::from_raw(url_value as *mut NSURL) {
            if let Some(path) = url.path() {
                out.push(path.to_string());
            }
        }
    }
}
