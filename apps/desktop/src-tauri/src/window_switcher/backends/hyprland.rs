use hyprland::{
    data::Clients,
    dispatch::{Dispatch, DispatchType, WindowIdentifier as HyprIdentifier},
    shared::{Address, HyprData as _},
};
use tauri::State;

use crate::{applications::icon_resolver::IconResolver, state::AppState};

use super::super::{
    app_name_from_entry, resolve_icon_path, Result, WindowEntry, WindowSwitcherError,
};

pub(crate) fn list_hypr_windows(
    state: &State<'_, AppState>,
    icon_resolver: &mut IconResolver,
) -> Result<Vec<WindowEntry>> {
    let clients = Clients::get().map_err(|e| WindowSwitcherError::ClientError(e.to_string()))?;
    let mut windows: Vec<WindowEntry> = Vec::new();

    for entry in clients.iter() {
        let id = format!("{}{}", super::super::HYPR_WINDOW_ID_PREFIX, entry.address);
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

        let app_name = app_name_from_entry(state, pid, &class);
        let app_icon = resolve_icon_path(icon_resolver, &app_name, &class);

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

pub(crate) fn find_hypr_window(address: &Address) -> Result<bool> {
    let clients = Clients::get().map_err(|e| WindowSwitcherError::ClientError(e.to_string()))?;
    Ok(clients.iter().any(|entry| entry.address == *address))
}

pub(crate) fn focus_hypr_window(address: Address) -> Result<()> {
    let hypr_identifier = HyprIdentifier::Address(address);
    Dispatch::call(DispatchType::FocusWindow(hypr_identifier))
        .map_err(|e| WindowSwitcherError::FocusingWindowError(e.to_string()))?;
    Ok(())
}

pub(crate) fn close_hypr_window(address: Address) -> Result<()> {
    let hypr_identifier = HyprIdentifier::Address(address);
    Dispatch::call(DispatchType::CloseWindow(hypr_identifier))
        .map_err(|e| WindowSwitcherError::ClosingWindowError(e.to_string()))?;
    Ok(())
}
