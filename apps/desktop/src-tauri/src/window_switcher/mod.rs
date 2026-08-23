mod error;

use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, State};

use self::error::{Result, WindowSwitcherError};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowEntry {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub class_name: String,
    pub app_id: Option<String>,
    pub app_icon: String,
    pub workspace: String,
    pub is_focused: bool,
}

#[cfg(target_os = "linux")]
use crate::linux_desktop as desktop_backend;

#[cfg(target_os = "macos")]
use crate::macos::window_manager as desktop_backend;

#[command]
pub fn list_windows(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<WindowEntry>> {
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (&app, &state);
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        desktop_backend::list_windows(&app, &state)
            .map_err(|error| WindowSwitcherError::ClientError(error.to_string()))
    }
}

#[command]
pub fn focus_window(window_id: String) -> Result<()> {
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = window_id;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let normalized = window_id.trim();
        if normalized.is_empty() {
            return Err(WindowSwitcherError::InvalidWindowId);
        }

        desktop_backend::focus_window(normalized)
            .map_err(|error| WindowSwitcherError::FocusingWindowError(error.to_string()))
    }
}

#[command]
pub fn close_window(window_id: String) -> Result<()> {
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = window_id;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let normalized = window_id.trim();
        if normalized.is_empty() {
            return Err(WindowSwitcherError::InvalidWindowId);
        }

        desktop_backend::close_window(normalized)
            .map_err(|error| WindowSwitcherError::ClosingWindowError(error.to_string()))
    }
}
