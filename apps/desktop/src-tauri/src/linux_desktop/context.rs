use serde::Serialize;
use tauri::{command, State};

use crate::applications::raycast_compat::RaycastCompatApplication;
use crate::clipboard::SelectedFinderItem;
use crate::state::AppState;

use super::applications;
use super::clipboard;
use super::window_manager::{self, FocusedWindowInfo};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ContextState {
    Supported,
    Unavailable,
    Unsupported,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextValue<T> {
    pub state: ContextState,
    pub value: Option<T>,
    pub reason: Option<String>,
}

impl<T> ContextValue<T> {
    fn supported(value: T) -> Self {
        Self {
            state: ContextState::Supported,
            value: Some(value),
            reason: None,
        }
    }

    fn unavailable(reason: impl Into<String>) -> Self {
        Self {
            state: ContextState::Unavailable,
            value: None,
            reason: Some(reason.into()),
        }
    }

    fn unsupported(reason: impl Into<String>) -> Self {
        Self {
            state: ContextState::Unsupported,
            value: None,
            reason: Some(reason.into()),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopContextSources {
    pub selected_text_backend: String,
    pub selected_files_backend: String,
    pub window_backend: String,
    pub application_backend: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopContextCapabilities {
    pub selected_text: bool,
    pub selected_files: bool,
    pub focused_window: bool,
    pub frontmost_application: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopContextSnapshot {
    pub selected_text: ContextValue<String>,
    pub selected_files: ContextValue<Vec<SelectedFinderItem>>,
    pub focused_window: ContextValue<FocusedWindowInfo>,
    pub frontmost_application: ContextValue<RaycastCompatApplication>,
    pub sources: DesktopContextSources,
    pub capabilities: DesktopContextCapabilities,
}

#[cfg(target_os = "linux")]
pub fn get_desktop_context_snapshot(state: &AppState) -> DesktopContextSnapshot {
    let clipboard_capabilities = clipboard::active_capabilities();
    let window_capabilities = window_manager::active_capabilities();
    let selected_text_backend = clipboard::selected_text_backend_name();
    let selected_files_backend = clipboard::selected_files_backend_name();
    let window_backend = window_manager::active_backend_kind().as_str().to_string();

    let selected_text = match clipboard::selected_text() {
        Ok(value) if !value.trim().is_empty() => ContextValue::supported(value),
        Ok(_) if clipboard_capabilities.supports_selected_text => {
            ContextValue::unavailable("no selected text is currently available")
        }
        Ok(_) => ContextValue::unsupported("selected text is not supported on this session"),
        Err(error) if clipboard_capabilities.supports_selected_text => {
            ContextValue::unavailable(error.to_string())
        }
        Err(error) => ContextValue::unsupported(error.to_string()),
    };

    let selected_files = match clipboard::selected_files() {
        Ok(items) if !items.is_empty() => ContextValue::supported(items),
        Ok(_) if clipboard_capabilities.supports_selected_file_items => {
            ContextValue::unavailable("no transferable file selection is currently available")
        }
        Ok(_) => ContextValue::unsupported("selected files are not supported on this session"),
        Err(error) if clipboard_capabilities.supports_selected_file_items => {
            ContextValue::unavailable(error.to_string())
        }
        Err(error) => ContextValue::unsupported(error.to_string()),
    };

    let focused_window_result = window_manager::frontmost_window(state);
    let focused_window = match &focused_window_result {
        Ok(Some(info)) => ContextValue::supported(info.clone()),
        Ok(None) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable("could not determine the focused window")
        }
        Ok(None) => ContextValue::unsupported("focused window is not supported on this session"),
        Err(error) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable(error.to_string())
        }
        Err(error) => ContextValue::unsupported(error.to_string()),
    };

    let frontmost_application = match focused_window_result {
        Ok(Some(info)) => match applications::resolve_application_from_window(&info) {
            Ok(application) => ContextValue::supported(application),
            Err(error) => ContextValue::unavailable(error.to_string()),
        },
        Ok(None) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable("could not determine the frontmost application")
        }
        Ok(None) => {
            ContextValue::unsupported("frontmost application is not supported on this session")
        }
        Err(error) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable(error.to_string())
        }
        Err(error) => ContextValue::unsupported(error.to_string()),
    };

    DesktopContextSnapshot {
        selected_text,
        selected_files,
        focused_window,
        frontmost_application,
        sources: DesktopContextSources {
            selected_text_backend,
            selected_files_backend,
            application_backend: window_backend.clone(),
            window_backend,
        },
        capabilities: DesktopContextCapabilities {
            selected_text: clipboard_capabilities.supports_selected_text,
            selected_files: clipboard_capabilities.supports_selected_file_items,
            focused_window: window_capabilities.supports_frontmost_application,
            frontmost_application: window_capabilities.supports_frontmost_application,
        },
    }
}

#[cfg(not(target_os = "linux"))]
pub fn get_desktop_context_snapshot(_state: &AppState) -> DesktopContextSnapshot {
    DesktopContextSnapshot {
        selected_text: ContextValue::unsupported("desktop context is unavailable on this platform"),
        selected_files: ContextValue::unsupported(
            "desktop context is unavailable on this platform",
        ),
        focused_window: ContextValue::unsupported(
            "desktop context is unavailable on this platform",
        ),
        frontmost_application: ContextValue::unsupported(
            "desktop context is unavailable on this platform",
        ),
        sources: DesktopContextSources {
            selected_text_backend: "unsupported".to_string(),
            selected_files_backend: "unsupported".to_string(),
            window_backend: "unsupported".to_string(),
            application_backend: "unsupported".to_string(),
        },
        capabilities: DesktopContextCapabilities {
            selected_text: false,
            selected_files: false,
            focused_window: false,
            frontmost_application: false,
        },
    }
}

#[command]
pub fn get_desktop_context(state: State<'_, AppState>) -> DesktopContextSnapshot {
    get_desktop_context_snapshot(&state)
}
