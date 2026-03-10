use std::{process::Command, thread, time::Duration};

use arboard::Clipboard;

use crate::clipboard::{ClipboardContent, CopyOptions, ReadResult};
use crate::linux_desktop::capabilities::{ClipboardBackendCapabilities, DesktopBackendKind};
use crate::linux_desktop::environment::{detect_environment, LinuxDesktopEnvironment};
use crate::linux_desktop::gnome_extension;
use crate::linux_desktop::selection;

pub trait ClipboardProvider {
    fn backend_kind(&self) -> DesktopBackendKind;
    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool;
    fn capabilities(&self) -> ClipboardBackendCapabilities;
    fn clipboard_read(&self) -> Result<ReadResult, String>;
    fn clipboard_read_text(&self) -> Result<ReadResult, String>;
    fn clipboard_copy(
        &self,
        content: ClipboardContent,
        options: Option<CopyOptions>,
    ) -> Result<(), String>;
    fn clipboard_paste(&self, content: ClipboardContent) -> Result<(), String>;
    fn clipboard_clear(&self) -> Result<(), String>;
    fn selected_text(&self) -> Result<String, String>;
}

fn create_read_result(text: Option<String>) -> ReadResult {
    let file = text.as_ref().and_then(|value| {
        if value.lines().count() == 1 && (value.starts_with('/') || value.starts_with("file://")) {
            Some(value.clone())
        } else {
            None
        }
    });

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
            ..ClipboardBackendCapabilities::generic()
        }
    }

    fn clipboard_read(&self) -> Result<ReadResult, String> {
        let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
        Ok(create_read_result(clipboard.get_text().ok()))
    }

    fn clipboard_read_text(&self) -> Result<ReadResult, String> {
        self.clipboard_read()
    }

    fn clipboard_copy(
        &self,
        content: ClipboardContent,
        _options: Option<CopyOptions>,
    ) -> Result<(), String> {
        let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
        if let Some(text) = normalize_text_content(&content) {
            clipboard
                .set_text(text)
                .map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn clipboard_paste(&self, content: ClipboardContent) -> Result<(), String> {
        let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
        let previous = clipboard.get_text().ok();
        self.clipboard_copy(content, None)?;
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

    fn clipboard_clear(&self) -> Result<(), String> {
        let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
        clipboard.clear().map_err(|error| error.to_string())
    }

    fn selected_text(&self) -> Result<String, String> {
        Err("selected text is not available on this Linux session".to_string())
    }
}

#[derive(Default)]
struct GnomeClipboardProvider;

impl GnomeClipboardProvider {
    fn serialize_content(content: &ClipboardContent) -> Result<String, String> {
        serde_json::to_string(content).map_err(|error| error.to_string())
    }

    fn read_payload() -> Result<ReadResult, String> {
        let payload = gnome_extension::dbus::read_clipboard_payload()?;
        serde_json::from_str::<ReadResult>(&payload)
            .map_err(|error| format!("failed to parse GNOME clipboard payload: {error}"))
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

    fn clipboard_read(&self) -> Result<ReadResult, String> {
        Self::read_payload()
    }

    fn clipboard_read_text(&self) -> Result<ReadResult, String> {
        Self::read_payload()
    }

    fn clipboard_copy(
        &self,
        content: ClipboardContent,
        _options: Option<CopyOptions>,
    ) -> Result<(), String> {
        let payload = Self::serialize_content(&content)?;
        gnome_extension::dbus::write_clipboard(&payload).and_then(|ok| {
            if ok {
                Ok(())
            } else {
                Err("GNOME extension refused to write clipboard content".to_string())
            }
        })
    }

    fn clipboard_paste(&self, content: ClipboardContent) -> Result<(), String> {
        let payload = Self::serialize_content(&content)?;
        gnome_extension::dbus::paste_clipboard(&payload).and_then(|ok| {
            if ok {
                Ok(())
            } else {
                Err("GNOME extension refused to paste clipboard content".to_string())
            }
        })
    }

    fn clipboard_clear(&self) -> Result<(), String> {
        self.clipboard_copy(
            ClipboardContent {
                text: Some(String::new()),
                html: None,
                file: None,
            },
            None,
        )
    }

    fn selected_text(&self) -> Result<String, String> {
        gnome_extension::dbus::selection_text()
    }
}

fn select_provider(env: &LinuxDesktopEnvironment) -> Box<dyn ClipboardProvider> {
    let candidates: Vec<Box<dyn ClipboardProvider>> = vec![
        Box::<GnomeClipboardProvider>::default(),
        Box::<GenericClipboardProvider>::default(),
    ];
    for candidate in candidates {
        if candidate.is_activatable(env) {
            return candidate;
        }
    }
    Box::<GenericClipboardProvider>::default()
}

pub fn active_backend_kind() -> DesktopBackendKind {
    let env = detect_environment();
    select_provider(&env).backend_kind()
}

pub fn active_capabilities() -> ClipboardBackendCapabilities {
    let env = detect_environment();
    let provider = select_provider(&env);
    let mut capabilities = provider.capabilities();
    if env.session_type == "x11" {
        capabilities.supports_selected_text = selection::x11_primary_selection_supported();
    }
    capabilities
}

pub fn clipboard_read() -> Result<ReadResult, String> {
    let env = detect_environment();
    select_provider(&env).clipboard_read()
}

pub fn clipboard_read_text() -> Result<ReadResult, String> {
    let env = detect_environment();
    select_provider(&env).clipboard_read_text()
}

pub fn clipboard_copy(
    content: ClipboardContent,
    options: Option<CopyOptions>,
) -> Result<(), String> {
    let env = detect_environment();
    select_provider(&env).clipboard_copy(content, options)
}

pub fn clipboard_paste(content: ClipboardContent) -> Result<(), String> {
    let env = detect_environment();
    select_provider(&env).clipboard_paste(content)
}

pub fn clipboard_clear() -> Result<(), String> {
    let env = detect_environment();
    select_provider(&env).clipboard_clear()
}

pub fn selected_text() -> Result<String, String> {
    let env = detect_environment();
    if env.session_type == "x11" {
        return selection::read_x11_primary_selection();
    }
    select_provider(&env).selected_text()
}
