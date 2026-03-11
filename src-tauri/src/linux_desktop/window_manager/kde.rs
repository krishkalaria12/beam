use crate::applications::icon_resolver::IconResolver;
use crate::linux_desktop::kde_bridge;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::super::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use super::super::environment::LinuxDesktopEnvironment;
use super::error::{Result, WindowManagerError};
use super::{resolve_icon_path, FocusedWindowInfo, WindowProvider};

#[derive(Default)]
pub struct KdeWindowProvider;

fn normalized_kde_app_id(window: &kde_bridge::KdeWindowMetadata) -> String {
    window
        .desktop_file
        .as_deref()
        .unwrap_or(window.class_hint.as_str())
        .trim()
        .trim_end_matches(".desktop")
        .to_string()
}

fn display_name_from_app_id(app_id: &str) -> String {
    app_id
        .split('.')
        .next_back()
        .unwrap_or(app_id)
        .replace('-', " ")
        .trim()
        .to_string()
}

fn metadata_to_window_entry(
    state: &AppState,
    icon_resolver: &mut IconResolver,
    window: &kde_bridge::KdeWindowMetadata,
) -> WindowEntry {
    let class_name = normalized_kde_app_id(window);
    let class_name = class_name.as_str();

    let app_name = if let Some(pid) = window.pid {
        super::app_name_from_entry(state, pid, class_name)
    } else if !window.app_name_hint.trim().is_empty()
        && !window.app_name_hint.trim().ends_with(".desktop")
    {
        window.app_name_hint.trim().to_string()
    } else if !class_name.is_empty() {
        display_name_from_app_id(class_name)
    } else {
        window.title.trim().to_string()
    };

    let app_icon = if !window.icon_hint.trim().is_empty() {
        let resolved = icon_resolver.resolve_from_name(window.icon_hint.trim());
        if resolved.is_empty() {
            resolve_icon_path(icon_resolver, &app_name, class_name)
        } else {
            resolved
        }
    } else {
        resolve_icon_path(icon_resolver, &app_name, class_name)
    };

    WindowEntry {
        id: window.id.clone(),
        title: window.title.clone(),
        app_name,
        app_icon,
        workspace: window.workspace.trim().to_string(),
        is_focused: window.is_active,
    }
}

fn metadata_to_focused_window(
    state: &AppState,
    icon_resolver: &mut IconResolver,
    window: &kde_bridge::KdeWindowMetadata,
) -> FocusedWindowInfo {
    let entry = metadata_to_window_entry(state, icon_resolver, window);
    let class_name = normalized_kde_app_id(window);

    FocusedWindowInfo {
        id: entry.id,
        title: entry.title,
        app_name: entry.app_name,
        class_name: class_name.clone(),
        app_id: window
            .desktop_file
            .clone()
            .or_else(|| (!class_name.is_empty()).then_some(class_name)),
        pid: window.pid,
        workspace: entry.workspace,
        is_focused: window.is_active,
    }
}

impl WindowProvider for KdeWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::KdeKwinDbus
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        (env.desktop_environment == "kde" || env.compositor == "kde") && kde_bridge::is_available()
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities {
            supports_window_listing: true,
            supports_window_focus: true,
            supports_window_close: kde_bridge::supports_close(),
            supports_frontmost_application: true,
        }
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>> {
        let windows = kde_bridge::list_windows().map_err(|error| {
            WindowManagerError::QueryError(format!("failed to read KDE windows: {error}"))
        })?;
        let mut icon_resolver = IconResolver::new();
        Ok(windows
            .iter()
            .map(|window| metadata_to_window_entry(state, &mut icon_resolver, window))
            .collect())
    }

    fn focus_window(&self, window_id: &str) -> Result<()> {
        kde_bridge::focus_window(window_id).map_err(|error| {
            WindowManagerError::CommandError(format!("failed to focus KDE window: {error}"))
        })
    }

    fn close_window(&self, window_id: &str) -> Result<()> {
        if !kde_bridge::supports_close() {
            return Err(WindowManagerError::BackendUnavailable(
                "KWin does not expose closeWindow on this system".to_string(),
            ));
        }

        kde_bridge::close_window(window_id).map_err(|error| {
            WindowManagerError::CommandError(format!(
                "KDE window close is unavailable or unsupported on this system: {error}"
            ))
        })
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>> {
        let windows = kde_bridge::list_windows().map_err(|error| {
            WindowManagerError::QueryError(format!("failed to read KDE windows: {error}"))
        })?;
        let mut icon_resolver = IconResolver::new();

        Ok(windows
            .iter()
            .find(|window| window.is_active)
            .or_else(|| windows.first())
            .map(|window| metadata_to_focused_window(state, &mut icon_resolver, window)))
    }
}
