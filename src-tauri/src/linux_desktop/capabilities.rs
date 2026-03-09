use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DesktopBackendKind {
    Hyprland,
    Sway,
    GnomeShellExtension,
    KdeKwinDbus,
    X11Ewmh,
    GenericClipboard,
    Unsupported,
}

impl DesktopBackendKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Hyprland => "hyprland",
            Self::Sway => "sway",
            Self::GnomeShellExtension => "gnome_shell_extension",
            Self::KdeKwinDbus => "kde_kwin_dbus",
            Self::X11Ewmh => "x11_ewmh",
            Self::GenericClipboard => "generic_clipboard",
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
}
