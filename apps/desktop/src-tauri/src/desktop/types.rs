use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DesktopBackendKind {
    Hyprland,
    Sway,
    GenericWayland,
    GnomeShellExtension,
    KdeKwinDbus,
    WaylandDataControl,
    X11PrimarySelection,
    X11Ewmh,
    GenericClipboard,
    MacosAccessibility,
    MacosPasteboard,
    Unsupported,
}

impl DesktopBackendKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Hyprland => "hyprland",
            Self::Sway => "sway",
            Self::GenericWayland => "generic_wayland",
            Self::GnomeShellExtension => "gnome_shell_extension",
            Self::KdeKwinDbus => "kde_kwin_dbus",
            Self::WaylandDataControl => "wayland_data_control",
            Self::X11PrimarySelection => "x11_primary_selection",
            Self::X11Ewmh => "x11_ewmh",
            Self::GenericClipboard => "generic_clipboard",
            Self::MacosAccessibility => "macos_accessibility",
            Self::MacosPasteboard => "macos_pasteboard",
            Self::Unsupported => "unsupported",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBackendCapabilities {
    pub supports_window_listing: bool,
    pub supports_window_focus: bool,
    pub supports_window_close: bool,
    pub supports_frontmost_application: bool,
}

impl WindowBackendCapabilities {
    pub const fn unsupported() -> Self {
        Self {
            supports_window_listing: false,
            supports_window_focus: false,
            supports_window_close: false,
            supports_frontmost_application: false,
        }
    }

    pub const fn standard_with_close() -> Self {
        Self {
            supports_window_listing: true,
            supports_window_focus: true,
            supports_window_close: true,
            supports_frontmost_application: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardBackendCapabilities {
    pub supports_clipboard_read: bool,
    pub supports_clipboard_write: bool,
    pub supports_clipboard_paste: bool,
    pub supports_selected_text: bool,
    pub supports_selected_file_items: bool,
}

impl ClipboardBackendCapabilities {
    pub const fn unsupported() -> Self {
        Self {
            supports_clipboard_read: false,
            supports_clipboard_write: false,
            supports_clipboard_paste: false,
            supports_selected_text: false,
            supports_selected_file_items: false,
        }
    }

    pub const fn generic() -> Self {
        Self {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: true,
            supports_selected_text: false,
            supports_selected_file_items: false,
        }
    }

    pub const fn full() -> Self {
        Self {
            supports_clipboard_read: true,
            supports_clipboard_write: true,
            supports_clipboard_paste: true,
            supports_selected_text: true,
            supports_selected_file_items: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusedWindowInfo {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub class_name: String,
    pub app_id: Option<String>,
    pub pid: Option<u32>,
    pub workspace: String,
    pub is_focused: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaylandHelperStatus {
    pub available: bool,
    pub backend: Option<String>,
    pub helper_path: Option<String>,
    pub last_error: Option<String>,
}

impl WaylandHelperStatus {
    pub fn unavailable() -> Self {
        Self {
            available: false,
            backend: None,
            helper_path: None,
            last_error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GnomeExtensionStatus {
    pub installed: bool,
    pub enabled: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub dbus_reachable: bool,
    pub update_required: bool,
}

