// PORT: apps/desktop/src-tauri/src/desktop/context.rs
// The command wrapper is gone; the snapshot builder takes &AppState.

use serde::Serialize;

use crate::applications::raycast_compat::RaycastCompatApplication;
use crate::clipboard::SelectedFinderItem;
use crate::desktop::types::FocusedWindowInfo;
use crate::state::AppState;

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

/// One selection-aware input to the desktop context (selected text or files).
struct SelectionSource<T> {
    result: Result<T, String>,
    supported: bool,
    backend_name: String,
}

/// Window-manager-derived input to the desktop context.
struct WindowSource {
    backend_kind: crate::desktop::types::DesktopBackendKind,
    capabilities: crate::desktop::types::WindowBackendCapabilities,
    frontmost_result: Result<Option<FocusedWindowInfo>, String>,
}

fn build_snapshot(
    selected_text: SelectionSource<String>,
    selected_files: SelectionSource<Vec<SelectedFinderItem>>,
    windows: WindowSource,
) -> DesktopContextSnapshot {
    let SelectionSource {
        result: selected_text_result,
        supported: selected_text_supported,
        backend_name: selected_text_backend,
    } = selected_text;
    let SelectionSource {
        result: selected_files_result,
        supported: selected_files_supported,
        backend_name: selected_files_backend,
    } = selected_files;
    let window_capabilities = windows.capabilities;

    let selected_text = match selected_text_result {
        Ok(value) if !value.trim().is_empty() => ContextValue::supported(value),
        Ok(_) if selected_text_supported => {
            ContextValue::unavailable("no selected text is currently available")
        }
        Ok(_) => ContextValue::unsupported("selected text is not supported on this session"),
        Err(error) if selected_text_supported => ContextValue::unavailable(error),
        Err(error) => ContextValue::unsupported(error),
    };

    let selected_files = match selected_files_result {
        Ok(items) if !items.is_empty() => ContextValue::supported(items),
        Ok(_) if selected_files_supported => {
            ContextValue::unavailable("no transferable file selection is currently available")
        }
        Ok(_) => ContextValue::unsupported("selected files are not supported on this session"),
        Err(error) if selected_files_supported => ContextValue::unavailable(error),
        Err(error) => ContextValue::unsupported(error),
    };

    let focused_window = match &windows.frontmost_result {
        Ok(Some(info)) => ContextValue::supported(info.clone()),
        Ok(None) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable("could not determine the focused window")
        }
        Ok(None) => ContextValue::unsupported("focused window is not supported on this session"),
        Err(error) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable(error.clone())
        }
        Err(error) => ContextValue::unsupported(error),
    };

    let frontmost_application = match windows.frontmost_result {
        Ok(Some(info)) => resolve_frontmost_application(&info).map_or_else(
            |error| ContextValue::unavailable(error.to_string()),
            ContextValue::supported,
        ),
        Ok(None) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable("could not determine the frontmost application")
        }
        Ok(None) => {
            ContextValue::unsupported("frontmost application is not supported on this session")
        }
        Err(error) if window_capabilities.supports_frontmost_application => {
            ContextValue::unavailable(error)
        }
        Err(error) => ContextValue::unsupported(error),
    };

    let window_backend = windows.backend_kind.as_str().to_string();

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
            selected_text: selected_text_supported,
            selected_files: selected_files_supported,
            focused_window: window_capabilities.supports_frontmost_application,
            frontmost_application: window_capabilities.supports_frontmost_application,
        },
    }
}

/// Resolves a focused-window descriptor to the owning application bundle.
#[cfg(target_os = "macos")]
fn resolve_frontmost_application(
    info: &FocusedWindowInfo,
) -> std::result::Result<RaycastCompatApplication, String> {
    use crate::applications::raycast_compat::RaycastCompatApplication;

    let bundle_id = info.app_id.clone().or_else(|| {
        let class_name = info.class_name.trim();
        (!class_name.is_empty()).then(|| class_name.to_string())
    });

    let Some(bundle_id) = bundle_id else {
        return Err("the focused window has no owning application".to_string());
    };

    let name = info.app_name.trim().to_string();
    let display_name = if name.is_empty() {
        bundle_id.clone()
    } else {
        name.clone()
    };
    Ok(RaycastCompatApplication {
        path: crate::macos::workspace::bundle_path_for_bundle_id(&bundle_id).unwrap_or_default(),
        name: display_name.clone(),
        localized_name: display_name,
        bundle_id,
        windows_app_id: String::new(),
    })
}

#[cfg(target_os = "linux")]
fn resolve_frontmost_application(
    info: &FocusedWindowInfo,
) -> std::result::Result<RaycastCompatApplication, String> {
    crate::linux_desktop::applications::resolve_application_from_window(info)
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
pub fn get_desktop_context_snapshot(state: &AppState) -> DesktopContextSnapshot {
    let clipboard_capabilities = crate::macos::clipboard::active_capabilities();

    build_snapshot(
        SelectionSource {
            result: crate::macos::clipboard::selected_text(),
            supported: clipboard_capabilities.supports_selected_text,
            backend_name: crate::macos::clipboard::selected_text_backend_name(),
        },
        SelectionSource {
            result: crate::macos::clipboard::selected_files(),
            supported: clipboard_capabilities.supports_selected_file_items,
            backend_name: crate::macos::clipboard::selected_files_backend_name(),
        },
        WindowSource {
            backend_kind: crate::macos::window_manager::active_backend_kind(),
            capabilities: crate::macos::window_manager::active_capabilities(),
            frontmost_result: crate::macos::window_manager::frontmost_window(state),
        },
    )
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
pub fn get_desktop_context_snapshot(_state: &AppState) -> DesktopContextSnapshot {
    const UNAVAILABLE: &str = "desktop context is unavailable on this platform";

    build_snapshot(
        SelectionSource {
            result: Err(UNAVAILABLE.to_string()),
            supported: false,
            backend_name: "unsupported".to_string(),
        },
        SelectionSource {
            result: Err(UNAVAILABLE.to_string()),
            supported: false,
            backend_name: "unsupported".to_string(),
        },
        WindowSource {
            backend_kind: crate::desktop::types::DesktopBackendKind::Unsupported,
            capabilities: crate::desktop::types::WindowBackendCapabilities::unsupported(),
            frontmost_result: Err(UNAVAILABLE.to_string()),
        },
    )
}

#[cfg(target_os = "linux")]
pub fn get_desktop_context_snapshot(state: &AppState) -> DesktopContextSnapshot {
    let clipboard_capabilities = crate::linux_desktop::clipboard::active_capabilities();

    build_snapshot(
        SelectionSource {
            result: crate::linux_desktop::clipboard::selected_text()
                .map_err(|error| error.to_string()),
            supported: clipboard_capabilities.supports_selected_text,
            backend_name: crate::linux_desktop::clipboard::selected_text_backend_name(),
        },
        SelectionSource {
            result: crate::linux_desktop::clipboard::selected_files()
                .map_err(|error| error.to_string()),
            supported: clipboard_capabilities.supports_selected_file_items,
            backend_name: crate::linux_desktop::clipboard::selected_files_backend_name(),
        },
        WindowSource {
            backend_kind: crate::linux_desktop::window_manager::active_backend_kind(),
            capabilities: crate::linux_desktop::window_manager::active_capabilities(),
            frontmost_result: crate::linux_desktop::window_manager::frontmost_window(state)
                .map_err(|error| error.to_string()),
        },
    )
}

pub fn get_desktop_context(state: &AppState) -> DesktopContextSnapshot {
    get_desktop_context_snapshot(state)
}
