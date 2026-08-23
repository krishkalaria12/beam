use serde::{Deserialize, Serialize};

use super::types::{
    ClipboardBackendCapabilities, DesktopBackendKind, GnomeExtensionStatus, WaylandHelperStatus,
    WindowBackendCapabilities,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopIntegrationStatus {
    pub platform: String,
    pub session_type: String,
    pub desktop_environment: String,
    pub compositor: String,
    pub window_backend: String,
    pub clipboard_backend: String,
    pub selected_text_backend: String,
    pub selected_files_backend: String,
    pub wayland_helper: WaylandHelperStatus,
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

#[allow(clippy::too_many_arguments)]
fn build_status(
    platform: &str,
    session_type: &str,
    desktop_environment: &str,
    compositor: &str,
    window_backend: DesktopBackendKind,
    clipboard_backend: DesktopBackendKind,
    selected_text_backend: String,
    selected_files_backend: String,
    window_capabilities: WindowBackendCapabilities,
    clipboard_capabilities: ClipboardBackendCapabilities,
    supports_default_application: bool,
    wayland_helper: Option<WaylandHelperStatus>,
    gnome_extension: Option<GnomeExtensionStatus>,
    mut notes: Vec<String>,
) -> DesktopIntegrationStatus {
    if !window_capabilities.supports_window_listing && notes.is_empty() {
        if platform == "macos" {
            notes.push(
                "Grant Beam the Accessibility permission in System Settings to enable window \
                 switching and selection-aware features."
                    .to_string(),
            );
        } else {
            notes.push(
                "Beam could not activate a deep desktop integration backend for this session."
                    .to_string(),
            );
        }
    }

    DesktopIntegrationStatus {
        platform: platform.to_string(),
        session_type: session_type.to_string(),
        desktop_environment: desktop_environment.to_string(),
        compositor: compositor.to_string(),
        window_backend: window_backend.as_str().to_string(),
        clipboard_backend: clipboard_backend.as_str().to_string(),
        selected_text_backend,
        selected_files_backend,
        wayland_helper: wayland_helper.unwrap_or_else(WaylandHelperStatus::unavailable),
        supports_window_listing: window_capabilities.supports_window_listing,
        supports_window_focus: window_capabilities.supports_window_focus,
        supports_window_close: window_capabilities.supports_window_close,
        supports_frontmost_application: window_capabilities.supports_frontmost_application,
        supports_default_application,
        supports_clipboard_read: clipboard_capabilities.supports_clipboard_read,
        supports_clipboard_write: clipboard_capabilities.supports_clipboard_write,
        supports_clipboard_paste: clipboard_capabilities.supports_clipboard_paste,
        supports_selected_text: clipboard_capabilities.supports_selected_text,
        supports_selected_file_items: clipboard_capabilities.supports_selected_file_items,
        notes,
        gnome_extension,
    }
}

#[cfg(target_os = "macos")]
pub fn get_status() -> DesktopIntegrationStatus {
    use crate::desktop::types::DesktopBackendKind as Kind;

    let accessibility = crate::macos::window_manager::ax_trusted();
    let window_kind = if accessibility {
        Kind::MacosAccessibility
    } else {
        Kind::Unsupported
    };

    build_status(
        "macos",
        "aqua",
        "macos",
        "aqua",
        window_kind,
        crate::macos::clipboard::active_backend_kind(),
        crate::macos::clipboard::selected_text_backend_name(),
        crate::macos::clipboard::selected_files_backend_name(),
        crate::macos::window_manager::active_capabilities(),
        crate::macos::clipboard::active_capabilities(),
        true,
        None,
        None,
        Vec::new(),
    )
}

#[cfg(target_os = "linux")]
pub fn get_status() -> DesktopIntegrationStatus {
    use crate::linux_desktop;

    let environment = linux_desktop::environment::detect_environment();
    let window_backend = linux_desktop::window_manager::active_backend_kind();
    let clipboard_backend = linux_desktop::clipboard::active_backend_kind();
    let window_capabilities = linux_desktop::window_manager::active_capabilities();
    let clipboard_capabilities = linux_desktop::clipboard::active_capabilities();
    let helper_status = linux_desktop::wayland_helper::helper_status(&environment);

    let gnome_extension = (environment.desktop_environment == "gnome")
        .then(linux_desktop::gnome_extension::status::get_status)
        .flatten();

    let mut notes = Vec::new();
    match window_backend {
        DesktopBackendKind::Unsupported => notes.push(
            "Beam could not activate a deep desktop integration backend for this Linux session."
                .to_string(),
        ),
        DesktopBackendKind::GenericClipboard => notes.push(
            "Clipboard support is using the generic Linux backend; selected file items remain unsupported."
                .to_string(),
        ),
        DesktopBackendKind::GenericWayland => notes.push(
            "Beam is using the generic Wayland toplevel backend. Listing works broadly, but focus and close are still compositor-dependent."
                .to_string(),
        ),
        DesktopBackendKind::WaylandDataControl => notes.push(
            "Beam is using the dedicated Wayland data-control helper for selection-aware text and file context."
                .to_string(),
        ),
        DesktopBackendKind::X11PrimarySelection => notes.push(
            "Beam is reading selected context from the X11 PRIMARY selection owner.".to_string(),
        ),
        DesktopBackendKind::KdeKwinDbus => notes.push(
            "KDE window integration is active. Window close and selected text may still be unavailable depending on your Plasma setup."
                .to_string(),
        ),
        _ => {}
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
    if environment.session_type == "wayland" && !helper_status.available {
        notes.push(helper_status.last_error.clone().unwrap_or_else(|| {
            "Wayland data-control helper is unavailable on this session.".to_string()
        }));
    }

    build_status(
        "linux",
        &environment.session_type,
        &environment.desktop_environment,
        &environment.compositor,
        window_backend,
        clipboard_backend,
        linux_desktop::clipboard::selected_text_backend_name(),
        linux_desktop::clipboard::selected_files_backend_name(),
        window_capabilities,
        clipboard_capabilities,
        true,
        Some(helper_status),
        gnome_extension,
        notes,
    )
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
pub fn get_status() -> DesktopIntegrationStatus {
    build_status(
        std::env::consts::OS,
        "unknown",
        "unknown",
        "unknown",
        DesktopBackendKind::Unsupported,
        DesktopBackendKind::Unsupported,
        "unsupported".to_string(),
        "unsupported".to_string(),
        WindowBackendCapabilities::unsupported(),
        ClipboardBackendCapabilities::unsupported(),
        false,
        None,
        None,
        Vec::new(),
    )
}

#[tauri::command]
pub fn get_desktop_integration_status() -> DesktopIntegrationStatus {
    get_status()
}
