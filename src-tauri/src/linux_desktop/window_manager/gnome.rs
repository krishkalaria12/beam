use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::super::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use super::super::environment::LinuxDesktopEnvironment;
use super::super::gnome_extension;
use super::error::{Result, WindowManagerError};
use super::{FocusedWindowInfo, WindowProvider};

#[derive(Default)]
pub struct GnomeWindowProvider;

impl GnomeWindowProvider {
    fn list_windows_json() -> Result<Vec<FocusedWindowInfo>> {
        let payload = gnome_extension::dbus::list_windows_payload()?;
        serde_json::from_str::<Vec<FocusedWindowInfo>>(&payload).map_err(|error| {
            WindowManagerError::ParseError(format!("failed to parse GNOME windows: {error}"))
        })
    }

    fn focused_window_json() -> Result<Option<FocusedWindowInfo>> {
        let payload = gnome_extension::dbus::focused_window_payload()?;
        if payload.trim().is_empty() || payload.trim() == "{}" {
            return Ok(None);
        }
        serde_json::from_str::<FocusedWindowInfo>(&payload)
            .map(Some)
            .map_err(|error| {
                WindowManagerError::ParseError(format!(
                    "failed to parse GNOME focused window: {error}"
                ))
            })
    }
}

impl WindowProvider for GnomeWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::GnomeShellExtension
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "gnome"
            && gnome_extension::status::get_status()
                .map(|status| status.dbus_reachable)
                .unwrap_or(false)
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(&self, _state: &AppState) -> Result<Vec<WindowEntry>> {
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

    fn focus_window(&self, window_id: &str) -> Result<()> {
        let id = window_id.trim().parse::<u32>().map_err(|_| {
            WindowManagerError::InvalidWindowId("GNOME window id is invalid".to_string())
        })?;
        let ok = gnome_extension::dbus::focus_window(id)?;
        if ok {
            Ok(())
        } else {
            Err(WindowManagerError::CommandError(
                "GNOME Shell extension refused to focus the requested window".to_string(),
            ))
        }
    }

    fn close_window(&self, window_id: &str) -> Result<()> {
        let id = window_id.trim().parse::<u32>().map_err(|_| {
            WindowManagerError::InvalidWindowId("GNOME window id is invalid".to_string())
        })?;
        let ok = gnome_extension::dbus::close_window(id)?;
        if ok {
            Ok(())
        } else {
            Err(WindowManagerError::CommandError(
                "GNOME Shell extension refused to close the requested window".to_string(),
            ))
        }
    }

    fn frontmost_window(&self, _state: &AppState) -> Result<Option<FocusedWindowInfo>> {
        Self::focused_window_json()
    }
}
