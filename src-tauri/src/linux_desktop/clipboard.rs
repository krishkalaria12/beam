use std::{collections::HashSet, process::Command, thread, time::Duration};

use arboard::Clipboard;
use url::Url;

use crate::clipboard::{ClipboardContent, CopyOptions, ReadResult, SelectedFinderItem};

use super::capabilities::{ClipboardBackendCapabilities, DesktopBackendKind};
use super::environment::{detect_environment, LinuxDesktopEnvironment};
use super::error::{LinuxDesktopError, Result};
use super::gnome_extension;
use super::selection;
use super::wayland_helper;

#[derive(Debug, Clone, Default)]
struct SelectionSnapshot {
    text: Option<String>,
    files: Vec<SelectedFinderItem>,
}

trait ClipboardProvider {
    fn backend_kind(&self) -> DesktopBackendKind;
    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool;
    fn capabilities(&self) -> ClipboardBackendCapabilities;
    fn clipboard_read(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult>;
    fn clipboard_read_text(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult>;
    fn clipboard_copy(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
        options: Option<CopyOptions>,
    ) -> Result<()>;
    fn clipboard_paste(&self, env: &LinuxDesktopEnvironment, content: ClipboardContent)
        -> Result<()>;
    fn clipboard_clear(&self, env: &LinuxDesktopEnvironment) -> Result<()>;
    fn selected_content(&self, env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot>;
}

fn create_read_result(text: Option<String>) -> ReadResult {
    let file = text
        .as_ref()
        .and_then(|value| infer_selected_file_items(Some(value), &[]).into_iter().next())
        .map(|item| item.path);

    ReadResult {
        text,
        html: None,
        file,
    }
}

fn normalize_text_content(content: &ClipboardContent) -> Option<String> {
    if let Some(file) = &content.file {
        return Some(file.clone());
    }
    if let Some(text) = &content.text {
        return Some(text.clone());
    }
    content.html.clone()
}

fn trigger_linux_paste_shortcut() {
    let _ = Command::new("xdotool").args(["key", "ctrl+v"]).status();
}

fn linux_paste_shortcut_available() -> bool {
    Command::new("xdotool")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[derive(Default)]
struct GenericClipboardProvider;

impl GenericClipboardProvider {
    fn clipboard_read_impl(&self) -> Result<ReadResult> {
        let mut clipboard = Clipboard::new()
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        Ok(create_read_result(clipboard.get_text().ok()))
    }

    fn clipboard_copy_impl(&self, content: ClipboardContent) -> Result<()> {
        let mut clipboard = Clipboard::new()
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        if let Some(text) = normalize_text_content(&content) {
            clipboard
                .set_text(text)
                .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        }
        Ok(())
    }
}

impl ClipboardProvider for GenericClipboardProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::GenericClipboard
    }

    fn is_activatable(&self, _env: &LinuxDesktopEnvironment) -> bool {
        true
    }

    fn capabilities(&self) -> ClipboardBackendCapabilities {
        ClipboardBackendCapabilities {
            supports_clipboard_paste: linux_paste_shortcut_available(),
            supports_selected_text: false,
            supports_selected_file_items: false,
            ..ClipboardBackendCapabilities::generic()
        }
    }

    fn clipboard_read(&self, _env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        self.clipboard_read_impl()
    }

    fn clipboard_read_text(&self, _env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        self.clipboard_read_impl()
    }

    fn clipboard_copy(
        &self,
        _env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
        _options: Option<CopyOptions>,
    ) -> Result<()> {
        self.clipboard_copy_impl(content)
    }

    fn clipboard_paste(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()> {
        let _ = env;
        let mut clipboard = Clipboard::new()
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        let previous = clipboard.get_text().ok();
        self.clipboard_copy_impl(content)?;
        thread::sleep(Duration::from_millis(60));
        trigger_linux_paste_shortcut();
        thread::sleep(Duration::from_millis(60));

        if let Some(text) = previous {
            let _ = clipboard.set_text(text);
        } else {
            let _ = clipboard.clear();
        }

        Ok(())
    }

    fn clipboard_clear(&self, _env: &LinuxDesktopEnvironment) -> Result<()> {
        let mut clipboard = Clipboard::new()
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        clipboard
            .clear()
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))
    }

    fn selected_content(&self, _env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot> {
        Err(LinuxDesktopError::SelectedTextError(
            "selected text is not available on this Linux session".to_string(),
        ))
    }
}

#[derive(Default)]
struct GnomeClipboardProvider;

impl GnomeClipboardProvider {
    fn serialize_content(content: &ClipboardContent) -> Result<String> {
        serde_json::to_string(content)
            .map_err(|error| LinuxDesktopError::SerializationError(error.to_string()))
    }

    fn read_payload() -> Result<ReadResult> {
        let payload = gnome_extension::dbus::read_clipboard_payload()?;
        serde_json::from_str::<ReadResult>(&payload).map_err(|error| {
            LinuxDesktopError::ParseError(format!(
                "failed to parse GNOME clipboard payload: {error}"
            ))
        })
    }
}

impl ClipboardProvider for GnomeClipboardProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::GnomeShellExtension
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "gnome"
            && gnome_extension::status::get_status()
                .map(|status| status.dbus_reachable)
                .unwrap_or(false)
    }

    fn capabilities(&self) -> ClipboardBackendCapabilities {
        ClipboardBackendCapabilities {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: true,
            supports_selected_text: true,
            supports_selected_file_items: false,
        }
    }

    fn clipboard_read(&self, _env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        Self::read_payload()
    }

    fn clipboard_read_text(&self, _env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        Self::read_payload()
    }

    fn clipboard_copy(
        &self,
        _env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
        _options: Option<CopyOptions>,
    ) -> Result<()> {
        let payload = Self::serialize_content(&content)?;
        let ok = gnome_extension::dbus::write_clipboard(&payload)?;
        if ok {
            Ok(())
        } else {
            Err(LinuxDesktopError::ClipboardError(
                "GNOME extension refused to write clipboard content".to_string(),
            ))
        }
    }

    fn clipboard_paste(
        &self,
        _env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()> {
        let payload = Self::serialize_content(&content)?;
        let ok = gnome_extension::dbus::paste_clipboard(&payload)?;
        if ok {
            Ok(())
        } else {
            Err(LinuxDesktopError::ClipboardError(
                "GNOME extension refused to paste clipboard content".to_string(),
            ))
        }
    }

    fn clipboard_clear(&self, env: &LinuxDesktopEnvironment) -> Result<()> {
        self.clipboard_copy(
            env,
            ClipboardContent {
                text: Some(String::new()),
                html: None,
                file: None,
            },
            None,
        )
    }

    fn selected_content(&self, _env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot> {
        let text = gnome_extension::dbus::selection_text().map_err(LinuxDesktopError::from)?;
        Ok(SelectionSnapshot {
            files: infer_selected_file_items(Some(&text), &[]),
            text: (!text.trim().is_empty()).then_some(text),
        })
    }
}

#[derive(Default)]
struct WaylandDataControlProvider;

impl ClipboardProvider for WaylandDataControlProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::WaylandDataControl
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.session_type == "wayland" && wayland_helper::helper_status(env).available
    }

    fn capabilities(&self) -> ClipboardBackendCapabilities {
        ClipboardBackendCapabilities {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: linux_paste_shortcut_available(),
            supports_selected_text: true,
            supports_selected_file_items: true,
        }
    }

    fn clipboard_read(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        let response = wayland_helper::read_clipboard_selection(env)
            .map_err(LinuxDesktopError::ClipboardError)?;
        Ok(create_read_result(response.text))
    }

    fn clipboard_read_text(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        self.clipboard_read(env)
    }

    fn clipboard_copy(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
        options: Option<CopyOptions>,
    ) -> Result<()> {
        GenericClipboardProvider.clipboard_copy(env, content, options)
    }

    fn clipboard_paste(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()> {
        GenericClipboardProvider.clipboard_paste(env, content)
    }

    fn clipboard_clear(&self, env: &LinuxDesktopEnvironment) -> Result<()> {
        GenericClipboardProvider.clipboard_clear(env)
    }

    fn selected_content(&self, env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot> {
        let response = wayland_helper::read_primary_selection(env)
            .map_err(LinuxDesktopError::SelectedTextError)?;
        let files = infer_selected_file_items(response.text.as_deref(), &response.file_uris);
        Ok(SelectionSnapshot {
            text: response.text.filter(|value| !value.trim().is_empty()),
            files,
        })
    }
}

#[derive(Default)]
struct X11SelectionProvider;

impl ClipboardProvider for X11SelectionProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::X11PrimarySelection
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.session_type == "x11" && selection::x11_primary_selection_supported()
    }

    fn capabilities(&self) -> ClipboardBackendCapabilities {
        ClipboardBackendCapabilities {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: linux_paste_shortcut_available(),
            supports_selected_text: true,
            supports_selected_file_items: true,
        }
    }

    fn clipboard_read(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        GenericClipboardProvider.clipboard_read(env)
    }

    fn clipboard_read_text(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        GenericClipboardProvider.clipboard_read_text(env)
    }

    fn clipboard_copy(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
        options: Option<CopyOptions>,
    ) -> Result<()> {
        GenericClipboardProvider.clipboard_copy(env, content, options)
    }

    fn clipboard_paste(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()> {
        GenericClipboardProvider.clipboard_paste(env, content)
    }

    fn clipboard_clear(&self, env: &LinuxDesktopEnvironment) -> Result<()> {
        GenericClipboardProvider.clipboard_clear(env)
    }

    fn selected_content(&self, _env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot> {
        let text = selection::read_x11_primary_selection()?;
        Ok(SelectionSnapshot {
            files: infer_selected_file_items(Some(&text), &[]),
            text: (!text.trim().is_empty()).then_some(text),
        })
    }
}

fn select_provider(env: &LinuxDesktopEnvironment) -> Box<dyn ClipboardProvider> {
    let candidates: Vec<Box<dyn ClipboardProvider>> = vec![
        Box::<GnomeClipboardProvider>::default(),
        Box::<WaylandDataControlProvider>::default(),
        Box::<X11SelectionProvider>::default(),
        Box::<GenericClipboardProvider>::default(),
    ];
    for candidate in candidates {
        if candidate.is_activatable(env) {
            return candidate;
        }
    }
    Box::<GenericClipboardProvider>::default()
}

fn infer_selected_file_items(text: Option<&str>, raw_uris: &[String]) -> Vec<SelectedFinderItem> {
    let mut seen = HashSet::new();
    let mut items = Vec::new();

    for raw_uri in raw_uris {
        if let Some(path) = normalize_selected_path(raw_uri) {
            if seen.insert(path.clone()) {
                items.push(SelectedFinderItem { path });
            }
        }
    }

    if let Some(text) = text {
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some(path) = normalize_selected_path(trimmed) {
                if seen.insert(path.clone()) {
                    items.push(SelectedFinderItem { path });
                }
            }
        }
    }

    items
}

fn normalize_selected_path(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Ok(url) = Url::parse(trimmed) {
        if url.scheme() == "file" {
            return url
                .to_file_path()
                .ok()
                .map(|path| path.to_string_lossy().to_string());
        }
        return None;
    }

    if trimmed.starts_with('/') {
        return Some(trimmed.to_string());
    }

    None
}

pub fn active_backend_kind() -> DesktopBackendKind {
    let env = detect_environment();
    select_provider(&env).backend_kind()
}

pub fn active_capabilities() -> ClipboardBackendCapabilities {
    let env = detect_environment();
    select_provider(&env).capabilities()
}

pub fn clipboard_read() -> Result<ReadResult> {
    let env = detect_environment();
    select_provider(&env).clipboard_read(&env)
}

pub fn clipboard_read_text() -> Result<ReadResult> {
    let env = detect_environment();
    select_provider(&env).clipboard_read_text(&env)
}

pub fn clipboard_copy(content: ClipboardContent, options: Option<CopyOptions>) -> Result<()> {
    let env = detect_environment();
    select_provider(&env).clipboard_copy(&env, content, options)
}

pub fn clipboard_paste(content: ClipboardContent) -> Result<()> {
    let env = detect_environment();
    select_provider(&env).clipboard_paste(&env, content)
}

pub fn clipboard_clear() -> Result<()> {
    let env = detect_environment();
    select_provider(&env).clipboard_clear(&env)
}

pub fn selected_text() -> Result<String> {
    let env = detect_environment();
    let snapshot = select_provider(&env).selected_content(&env)?;
    snapshot.text.ok_or_else(|| {
        LinuxDesktopError::SelectedTextError(
            "no selected text is currently available on this Linux session".to_string(),
        )
    })
}

pub fn selected_files() -> Result<Vec<SelectedFinderItem>> {
    let env = detect_environment();
    let snapshot = select_provider(&env).selected_content(&env)?;
    Ok(snapshot.files)
}

pub fn selected_text_backend_name() -> String {
    active_backend_kind().as_str().to_string()
}

pub fn selected_files_backend_name() -> String {
    active_backend_kind().as_str().to_string()
}

#[cfg(test)]
mod tests {
    use super::{infer_selected_file_items, normalize_selected_path};

    #[test]
    fn normalizes_file_urls() {
        assert_eq!(
            normalize_selected_path("file:///tmp/example.txt").as_deref(),
            Some("/tmp/example.txt")
        );
    }

    #[test]
    fn normalizes_absolute_paths() {
        assert_eq!(
            normalize_selected_path("/tmp/example.txt").as_deref(),
            Some("/tmp/example.txt")
        );
    }

    #[test]
    fn infers_selected_files_from_multiple_sources() {
        let items = infer_selected_file_items(
            Some("file:///tmp/example.txt\n/tmp/second.txt"),
            &[String::from("file:///tmp/example.txt")],
        );
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].path, "/tmp/example.txt");
        assert_eq!(items[1].path, "/tmp/second.txt");
    }
}
