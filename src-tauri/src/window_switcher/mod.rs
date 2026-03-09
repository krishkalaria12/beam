mod error;

use serde::{Deserialize, Serialize};
use tauri::{command, State};

use self::error::{Result, WindowSwitcherError};
use crate::{linux_desktop, state::AppState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowEntry {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub app_icon: String,
    pub workspace: String,
    pub is_focused: bool,
}

#[command]
pub fn list_windows(state: State<'_, AppState>) -> Result<Vec<WindowEntry>> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = state;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        linux_desktop::window_manager::list_windows(&state)
            .map_err(WindowSwitcherError::ClientError)
    }
}

#[command]
pub fn focus_window(window_id: String) -> Result<()> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = window_id;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let normalized = window_id.trim();
        if normalized.is_empty() {
            return Err(WindowSwitcherError::InvalidWindowId);
        }

        linux_desktop::window_manager::focus_window(normalized)
            .map_err(WindowSwitcherError::FocusingWindowError)
    }
}

#[command]
pub fn close_window(window_id: String) -> Result<()> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = window_id;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let normalized = window_id.trim();
        if normalized.is_empty() {
            return Err(WindowSwitcherError::InvalidWindowId);
        }

        linux_desktop::window_manager::close_window(normalized)
            .map_err(WindowSwitcherError::ClosingWindowError)
    }
}
