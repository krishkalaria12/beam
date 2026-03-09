use serde::{Deserialize, Serialize};

use crate::linux_desktop::capabilities::DesktopBackendKind;
use crate::linux_desktop::clipboard;
use crate::linux_desktop::environment::detect_environment;
use crate::linux_desktop::gnome_extension::status::GnomeExtensionStatus;
use crate::linux_desktop::window_manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopIntegrationStatus {
    pub platform: String,
    pub session_type: String,
    pub desktop_environment: String,
    pub compositor: String,
    pub window_backend: String,
    pub clipboard_backend: String,
    pub supports_window_listing: bool,
    pub supports_window_focus: bool,
    pub supports_window_close: bool,
    pub supports_frontmost_application: bool,
    pub supports_default_application: bool,
    pub supports_clipboard_read: bool,
    pub supports_clipboard_write: bool,
    pub supports_clipboard_paste: bool,
    pub supports_selected_text: bool,
    pub supports_selected_file_items: bool,
    pub notes: Vec<String>,
    pub gnome_extension: Option<GnomeExtensionStatus>,
}

fn backend_note(backend: DesktopBackendKind) -> Option<String> {
    match backend {
        DesktopBackendKind::Unsupported => Some(
            "Beam could not activate a deep desktop integration backend for this Linux session."
                .to_string(),
        ),
        DesktopBackendKind::GenericClipboard => Some(
            "Clipboard support is using the generic Linux backend; selected file items remain unsupported."
                .to_string(),
        ),
        DesktopBackendKind::KdeKwinDbus => Some(
            "KDE window integration is active. Window close and selected text may still be unavailable depending on your Plasma setup."
                .to_string(),
        ),
        _ => None,
    }
}

pub fn get_status() -> DesktopIntegrationStatus {
    let environment = detect_environment();
    let window_backend = window_manager::active_backend_kind();
    let clipboard_backend = clipboard::active_backend_kind();
    let window_capabilities = window_manager::active_capabilities();
    let clipboard_capabilities = clipboard::active_capabilities();

    let gnome_extension =
        (environment.desktop_environment == "gnome").then(crate::linux_desktop::gnome_extension::status::get_status).flatten();

    let mut notes = Vec::new();
    if let Some(note) = backend_note(window_backend) {
        notes.push(note);
    }
    if let Some(note) = backend_note(clipboard_backend) {
        notes.push(note);
    }
    if environment.desktop_environment == "gnome" && gnome_extension.is_none() {
        notes.push(
            "Install the Beam GNOME Shell extension for deeper GNOME window and selection support."
                .to_string(),
        );
    }
    if environment.session_type == "x11" {
        notes.push(
            "Selected text on X11 is read from the PRIMARY selection owner and may be empty when no app owns that selection."
                .to_string(),
        );
    }

    DesktopIntegrationStatus {
        platform: "linux".to_string(),
        session_type: environment.session_type,
        desktop_environment: environment.desktop_environment,
        compositor: environment.compositor,
        window_backend: window_backend.as_str().to_string(),
        clipboard_backend: clipboard_backend.as_str().to_string(),
        supports_window_listing: window_capabilities.supports_window_listing,
        supports_window_focus: window_capabilities.supports_window_focus,
        supports_window_close: window_capabilities.supports_window_close,
        supports_frontmost_application: window_capabilities.supports_frontmost_application,
        supports_default_application: true,
        supports_clipboard_read: clipboard_capabilities.supports_clipboard_read,
        supports_clipboard_write: clipboard_capabilities.supports_clipboard_write,
        supports_clipboard_paste: clipboard_capabilities.supports_clipboard_paste,
        supports_selected_text: clipboard_capabilities.supports_selected_text,
        supports_selected_file_items: clipboard_capabilities.supports_selected_file_items,
        notes,
        gnome_extension,
    }
}

#[tauri::command]
pub fn get_desktop_integration_status() -> DesktopIntegrationStatus {
    get_status()
}
