mod error;

#[cfg(target_os = "linux")]
use hyprland::{
    data::Clients,
    dispatch::{Dispatch, DispatchType, WindowIdentifier as HyprIdentifier},
    shared::{Address, HyprData as _},
};
use serde::{Deserialize, Serialize};
use tauri::{command, State};

use self::error::{Result, WindowSwitcherError};
use crate::{applications::icon_resolver::IconResolver, state::AppState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowEntry {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub app_icon: String,
    pub workspace: String,
    pub is_focused: bool,
}

fn app_name_from_entry(state: &State<'_, AppState>, pid: u32, class_name: &str) -> String {
    let process_name = state
        .process_cache
        .lock()
        .get_process_name(pid)
        .filter(|name| !name.trim().is_empty());
    if let Some(name) = process_name {
        return name;
    }

    class_name.trim().to_string()
}

#[command]
pub fn list_windows(state: State<'_, AppState>) -> Result<Vec<WindowEntry>> {
    #[cfg(not(target_os = "linux"))]
    {
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let clients =
            Clients::get().map_err(|e| WindowSwitcherError::ClientError(e.to_string()))?;
        let mut windows: Vec<WindowEntry> = Vec::new();
        let mut icon_resolver = IconResolver::new();

        for entry in clients.iter() {
            let id = entry.address.to_string();
            let window_title = entry.title.trim();
            let initial_title = entry.initial_title.trim();
            let title = if !window_title.is_empty() {
                window_title.to_string()
            } else {
                initial_title.to_string()
            };
            let class = entry.class.trim().to_string();
            let workspace = entry.workspace.name.trim().to_string();
            let is_focused = entry.focus_history_id == 0;
            let pid = entry.pid as u32;

            let app_name = app_name_from_entry(&state, pid, &class);
            let app_icon = resolve_icon_path(&mut icon_resolver, &app_name, &class);

            windows.push(WindowEntry {
                id,
                title,
                app_name,
                app_icon,
                workspace,
                is_focused,
            });
        }

        Ok(windows)
    }
}

fn resolve_icon_path(
    icon_resolver: &mut crate::applications::icon_resolver::IconResolver,
    app_name: &str,
    class_name: &str,
) -> String {
    let class_lower = class_name.trim().to_lowercase();
    let candidates = [app_name.trim(), class_name.trim(), class_lower.as_str()];

    for candidate in candidates {
        if candidate.is_empty() {
            continue;
        }
        let resolved = icon_resolver.resolve_from_name(candidate);
        if !resolved.is_empty() {
            return resolved;
        }
    }

    String::new()
}

#[cfg(target_os = "linux")]
fn find_client_by_address(address: &Address) -> Result<bool> {
    let clients = Clients::get().map_err(|e| WindowSwitcherError::ClientError(e.to_string()))?;
    Ok(clients.iter().any(|entry| entry.address == *address))
}

#[cfg(target_os = "linux")]
fn parse_window_address(window_id: &str) -> Result<Address> {
    let normalized = window_id.trim();
    if normalized.is_empty() {
        return Err(WindowSwitcherError::InvalidWindowId);
    }

    Ok(Address::new(normalized.to_string()))
}

#[command]
pub fn focus_window(window_id: String) -> Result<()> {
    #[cfg(not(target_os = "linux"))]
    {
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let address = parse_window_address(&window_id)?;
        if !find_client_by_address(&address)? {
            return Err(WindowSwitcherError::WindowNotFound(window_id));
        }

        let hypr_identifier = HyprIdentifier::Address(address);
        Dispatch::call(DispatchType::FocusWindow(hypr_identifier))
            .map_err(|e| WindowSwitcherError::FocusingWindowError(e.to_string()))?;

        Ok(())
    }
}

#[command]
pub fn close_window(window_id: String) -> Result<()> {
    #[cfg(not(target_os = "linux"))]
    {
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let address = parse_window_address(&window_id)?;
        if !find_client_by_address(&address)? {
            return Err(WindowSwitcherError::WindowNotFound(window_id));
        }

        let hypr_identifier = HyprIdentifier::Address(address);
        Dispatch::call(DispatchType::CloseWindow(hypr_identifier))
            .map_err(|e| WindowSwitcherError::ClosingWindowError(e.to_string()))?;
        Ok(())
    }
}
