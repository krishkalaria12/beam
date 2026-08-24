mod error;

use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, State};

use self::error::{Result, WindowSwitcherError};
use crate::state::AppState;

#[cfg(target_os = "linux")]
use crate::linux_desktop::window_manager as desktop_backend;

#[cfg(target_os = "macos")]
use crate::macos::window_manager as desktop_backend;

#[cfg(target_os = "windows")]
use crate::windows_desktop;

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

#[command]
pub fn list_windows(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<WindowEntry>> {
    #[cfg(target_os = "windows")]
    {
        return windows_desktop::window_manager::list_windows(&app, &state)
            .map_err(|error| WindowSwitcherError::ClientError(error.to_string()));
    }

    #[cfg(not(target_os = "windows"))]
    {
        desktop_backend::list_windows(&app, &state)
            .map_err(|error| WindowSwitcherError::ClientError(error.to_string()))
    }
}

#[command]
pub fn focus_window(window_id: String) -> Result<()> {
    let normalized = window_id.trim();
    if normalized.is_empty() {
        return Err(WindowSwitcherError::InvalidWindowId);
    }

    #[cfg(target_os = "windows")]
    {
        return windows_desktop::window_manager::focus_window(normalized)
            .map_err(|error| WindowSwitcherError::FocusingWindowError(error.to_string()));
    }

    #[cfg(not(target_os = "windows"))]
    {
        desktop_backend::focus_window(normalized)
            .map_err(|error| WindowSwitcherError::FocusingWindowError(error.to_string()))
    }
}

#[command]
pub fn close_window(window_id: String) -> Result<()> {
    let normalized = window_id.trim();
    if normalized.is_empty() {
        return Err(WindowSwitcherError::InvalidWindowId);
    }

    #[cfg(target_os = "windows")]
    {
        return windows_desktop::window_manager::close_window(normalized)
            .map_err(|error| WindowSwitcherError::ClosingWindowError(error.to_string()));
    }

    #[cfg(not(target_os = "windows"))]
    {
        desktop_backend::close_window(normalized)
            .map_err(|error| WindowSwitcherError::ClosingWindowError(error.to_string()))
    }
}
