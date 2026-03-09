use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;
use crate::linux_desktop::gnome_extension;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{FocusedWindowInfo, WindowProvider};

#[derive(Default)]
pub struct GnomeWindowProvider;

impl GnomeWindowProvider {
    fn list_windows_json() -> Result<Vec<FocusedWindowInfo>, String> {
        let payload = gnome_extension::dbus::list_windows_payload()?;
        serde_json::from_str::<Vec<FocusedWindowInfo>>(&payload)
            .map_err(|error| format!("failed to parse GNOME windows: {error}"))
    }

    fn focused_window_json() -> Result<Option<FocusedWindowInfo>, String> {
        let payload = gnome_extension::dbus::focused_window_payload()?;
        if payload.trim().is_empty() || payload.trim() == "{}" {
            return Ok(None);
        }
        serde_json::from_str::<FocusedWindowInfo>(&payload)
            .map(Some)
            .map_err(|error| format!("failed to parse GNOME focused window: {error}"))
    }
}

impl WindowProvider for GnomeWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::GnomeShellExtension
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "gnome" && gnome_extension::status::get_status().map(|status| status.dbus_reachable).unwrap_or(false)
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(&self, _state: &AppState) -> Result<Vec<WindowEntry>, String> {
        let windows = Self::list_windows_json()?;
        Ok(windows
            .into_iter()
            .map(|entry| WindowEntry {
                id: entry.id,
                title: entry.title,
                app_name: entry.app_name,
                app_icon: String::new(),
                workspace: entry.workspace,
                is_focused: entry.is_focused,
            })
            .collect())
    }

    fn focus_window(&self, window_id: &str) -> Result<(), String> {
        let id = window_id.trim().parse::<u32>().map_err(|_| "GNOME window id is invalid".to_string())?;
        gnome_extension::dbus::focus_window(id).and_then(|ok| {
            if ok {
                Ok(())
            } else {
                Err("GNOME Shell extension refused to focus the requested window".to_string())
            }
        })
    }

    fn close_window(&self, window_id: &str) -> Result<(), String> {
        let id = window_id.trim().parse::<u32>().map_err(|_| "GNOME window id is invalid".to_string())?;
        gnome_extension::dbus::close_window(id).and_then(|ok| {
            if ok {
                Ok(())
            } else {
                Err("GNOME Shell extension refused to close the requested window".to_string())
            }
        })
    }

    fn frontmost_window(&self, _state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
        Self::focused_window_json()
    }
}
