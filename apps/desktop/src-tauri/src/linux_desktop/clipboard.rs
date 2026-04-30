use std::{collections::HashSet, process::Command, thread, time::Duration};

use arboard::Clipboard;
use url::Url;

use crate::clipboard::convert_image::{get_image_as_base64, image_data_url_to_arboard_image};
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

#[derive(Debug, Clone)]
struct ResolvedSelectionSnapshot {
    snapshot: SelectionSnapshot,
    text_backend: DesktopBackendKind,
    files_backend: DesktopBackendKind,
    supports_text: bool,
    supports_files: bool,
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
    fn clipboard_paste(
        &self,
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()>;
    fn clipboard_clear(&self, env: &LinuxDesktopEnvironment) -> Result<()>;
    fn selected_content(&self, env: &LinuxDesktopEnvironment) -> Result<SelectionSnapshot>;
}

fn create_read_result(text: Option<String>) -> ReadResult {
    let file = text
        .as_ref()
        .and_then(|value| {
            infer_selected_file_items(Some(value), &[])
                .into_iter()
                .next()
        })
        .map(|item| item.path);

    ReadResult {
        text,
        html: None,
        file,
    }
}

fn merge_helper_read_result(text: Option<String>, image_data_url: Option<String>) -> ReadResult {
    create_read_result(text.or(image_data_url))
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

fn write_content_with_arboard(content: &ClipboardContent) -> Result<()> {
    let mut clipboard =
        Clipboard::new().map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;

    if let Some(image) = &content.image {
        clipboard
            .set_image(
                image_data_url_to_arboard_image(image)
                    .map_err(LinuxDesktopError::ClipboardError)?,
            )
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
        return Ok(());
    }

    if let Some(text) = normalize_text_content(content) {
        clipboard
            .set_text(text)
            .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
    }

    Ok(())
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
        if let Ok(text) = clipboard.get_text() {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                return Ok(create_read_result(Some(trimmed.to_string())));
            }
        }

        if let Ok(image_data) = clipboard.get_image() {
            return Ok(create_read_result(get_image_as_base64(image_data)));
        }

        Ok(create_read_result(None))
    }

    fn clipboard_copy_impl(&self, content: ClipboardContent) -> Result<()> {
        write_content_with_arboard(&content)
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
        let previous = self.clipboard_read_impl().ok();
        self.clipboard_copy_impl(content)?;
        thread::sleep(Duration::from_millis(60));
        trigger_linux_paste_shortcut();
        thread::sleep(Duration::from_millis(60));

        if let Some(snapshot) = previous {
            let _ = write_content_with_arboard(&ClipboardContent::from_read_result(snapshot));
        } else {
            let mut clipboard = Clipboard::new()
                .map_err(|error| LinuxDesktopError::ClipboardError(error.to_string()))?;
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

    fn clipboard_read(&self, env: &LinuxDesktopEnvironment) -> Result<ReadResult> {
        let payload = Self::read_payload()?;
        let payload_text = payload.text.filter(|value| !value.trim().is_empty());

        if env.session_type == "wayland" && wayland_helper::helper_status(env).available {
            let helper_response = wayland_helper::read_clipboard_selection(env)
                .map_err(LinuxDesktopError::ClipboardError)?;
            let helper_text = helper_response
                .text
                .filter(|value| !value.trim().is_empty());

            return Ok(merge_helper_read_result(
                payload_text.or(helper_text),
                helper_response.image_data_url,
            ));
        }

        if payload_text.is_some() {
            return Ok(create_read_result(payload_text));
        }

        GenericClipboardProvider
            .clipboard_read(env)
            .or_else(|_| Ok(create_read_result(None)))
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
        if content.image.is_some() {
            return write_content_with_arboard(&content);
        }

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
        env: &LinuxDesktopEnvironment,
        content: ClipboardContent,
    ) -> Result<()> {
        if content.image.is_some() {
            return GenericClipboardProvider.clipboard_paste(env, content);
        }

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
                image: None,
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
        Ok(merge_helper_read_result(
            response.text,
            response.image_data_url,
        ))
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

fn select_clipboard_provider_capabilities(
    env: &LinuxDesktopEnvironment,
) -> ClipboardBackendCapabilities {
    select_provider(env).capabilities()
}

fn resolve_gnome_wayland_selection(
    env: &LinuxDesktopEnvironment,
) -> Result<ResolvedSelectionSnapshot> {
    let gnome_provider = GnomeClipboardProvider;
    let helper_provider = WaylandDataControlProvider;

    let gnome_supported = gnome_provider.is_activatable(env);
    let helper_supported = helper_provider.is_activatable(env);
    let gnome_snapshot = gnome_supported
        .then(|| gnome_provider.selected_content(env))
        .transpose()?;
    let helper_snapshot = helper_supported
        .then(|| helper_provider.selected_content(env))
        .transpose()?;

    Ok(merge_gnome_wayland_selection(
        gnome_snapshot.as_ref(),
        helper_snapshot.as_ref(),
        gnome_supported,
        helper_supported,
    ))
}

fn merge_gnome_wayland_selection(
    gnome_snapshot: Option<&SelectionSnapshot>,
    helper_snapshot: Option<&SelectionSnapshot>,
    gnome_supported: bool,
    helper_supported: bool,
) -> ResolvedSelectionSnapshot {
    let text = gnome_snapshot
        .and_then(|snapshot| snapshot.text.clone())
        .or_else(|| helper_snapshot.and_then(|snapshot| snapshot.text.clone()));
    let files = helper_snapshot
        .map(|snapshot| snapshot.files.clone())
        .filter(|files| !files.is_empty())
        .or_else(|| {
            gnome_snapshot
                .map(|snapshot| snapshot.files.clone())
                .filter(|files| !files.is_empty())
        })
        .unwrap_or_default();

    let text_backend = if gnome_snapshot
        .and_then(|snapshot| snapshot.text.as_ref())
        .is_some()
    {
        DesktopBackendKind::GnomeShellExtension
    } else if helper_snapshot
        .and_then(|snapshot| snapshot.text.as_ref())
        .is_some()
    {
        DesktopBackendKind::WaylandDataControl
    } else if gnome_supported {
        DesktopBackendKind::GnomeShellExtension
    } else if helper_supported {
        DesktopBackendKind::WaylandDataControl
    } else {
        DesktopBackendKind::Unsupported
    };

    let files_backend = if helper_snapshot
        .map(|snapshot| !snapshot.files.is_empty())
        .unwrap_or(false)
    {
        DesktopBackendKind::WaylandDataControl
    } else if gnome_snapshot
        .map(|snapshot| !snapshot.files.is_empty())
        .unwrap_or(false)
    {
        DesktopBackendKind::GnomeShellExtension
    } else if helper_supported {
        DesktopBackendKind::WaylandDataControl
    } else if gnome_supported {
        DesktopBackendKind::GnomeShellExtension
    } else {
        DesktopBackendKind::Unsupported
    };

    ResolvedSelectionSnapshot {
        snapshot: SelectionSnapshot { text, files },
        text_backend,
        files_backend,
        supports_text: gnome_supported || helper_supported,
        supports_files: helper_supported,
    }
}

fn resolve_selection_snapshot(env: &LinuxDesktopEnvironment) -> Result<ResolvedSelectionSnapshot> {
    if env.session_type == "wayland" && env.desktop_environment == "gnome" {
        return resolve_gnome_wayland_selection(env);
    }

    let helper_provider = WaylandDataControlProvider;
    if helper_provider.is_activatable(env) {
        let snapshot = helper_provider.selected_content(env)?;
        return Ok(ResolvedSelectionSnapshot {
            snapshot,
            text_backend: DesktopBackendKind::WaylandDataControl,
            files_backend: DesktopBackendKind::WaylandDataControl,
            supports_text: true,
            supports_files: true,
        });
    }

    let x11_provider = X11SelectionProvider;
    if x11_provider.is_activatable(env) {
        let snapshot = x11_provider.selected_content(env)?;
        return Ok(ResolvedSelectionSnapshot {
            snapshot,
            text_backend: DesktopBackendKind::X11PrimarySelection,
            files_backend: DesktopBackendKind::X11PrimarySelection,
            supports_text: true,
            supports_files: true,
        });
    }

    Err(LinuxDesktopError::SelectedTextError(
        "selected text is not available on this Linux session".to_string(),
    ))
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
    let mut capabilities = select_clipboard_provider_capabilities(&env);

    if let Ok(selection) = resolve_selection_snapshot(&env) {
        capabilities.supports_selected_text = selection.supports_text;
        capabilities.supports_selected_file_items = selection.supports_files;
    }

    capabilities
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
    let snapshot = resolve_selection_snapshot(&env)?;
    snapshot.snapshot.text.ok_or_else(|| {
        LinuxDesktopError::SelectedTextError(
            "no selected text is currently available on this Linux session".to_string(),
        )
    })
}

pub fn selected_files() -> Result<Vec<SelectedFinderItem>> {
    let env = detect_environment();
    Ok(resolve_selection_snapshot(&env)?.snapshot.files)
}

pub fn selected_text_backend_name() -> String {
    let env = detect_environment();
    resolve_selection_snapshot(&env)
        .map(|selection| selection.text_backend.as_str().to_string())
        .unwrap_or_else(|_| DesktopBackendKind::Unsupported.as_str().to_string())
}

pub fn selected_files_backend_name() -> String {
    let env = detect_environment();
    resolve_selection_snapshot(&env)
        .map(|selection| selection.files_backend.as_str().to_string())
        .unwrap_or_else(|_| DesktopBackendKind::Unsupported.as_str().to_string())
}
