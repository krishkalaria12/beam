mod backends;
mod error;

#[cfg(target_os = "linux")]
use hyprland::shared::Address;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

use self::backends::{
    close_hypr_window, close_sway_window, find_hypr_window, find_sway_window, focus_hypr_window,
    focus_sway_window, list_hypr_windows, list_sway_windows,
};
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

#[cfg(target_os = "linux")]
enum LinuxWindowTarget {
    Hypr(Address),
    Sway(i64),
}

#[cfg(target_os = "linux")]
pub(super) const HYPR_WINDOW_ID_PREFIX: &str = "hypr:";
#[cfg(target_os = "linux")]
pub(super) const SWAY_WINDOW_ID_PREFIX: &str = "sway:";

pub(super) fn app_name_from_entry(
    state: &State<'_, AppState>,
    pid: u32,
    class_name: &str,
) -> String {
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

pub(super) fn resolve_icon_path(
    icon_resolver: &mut IconResolver,
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

#[command]
pub fn list_windows(state: State<'_, AppState>) -> Result<Vec<WindowEntry>> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = state;
        return Err(WindowSwitcherError::UnsupportedPlatform);
    }

    #[cfg(target_os = "linux")]
    {
        let mut icon_resolver = IconResolver::new();
        if let Ok(hypr_windows) = list_hypr_windows(&state, &mut icon_resolver) {
            return Ok(hypr_windows);
        }

        list_sway_windows(&state, &mut icon_resolver)
    }
}

#[cfg(target_os = "linux")]
fn parse_window_target(window_id: &str) -> Result<LinuxWindowTarget> {
    let normalized = window_id.trim();
    if normalized.is_empty() {
        return Err(WindowSwitcherError::InvalidWindowId);
    }

    if let Some(sway_id) = normalized.strip_prefix(SWAY_WINDOW_ID_PREFIX) {
        let parsed_id = sway_id
            .trim()
            .parse::<i64>()
            .map_err(|_| WindowSwitcherError::InvalidWindowId)?;
        return Ok(LinuxWindowTarget::Sway(parsed_id));
    }

    if let Some(hypr_address) = normalized.strip_prefix(HYPR_WINDOW_ID_PREFIX) {
        return Ok(LinuxWindowTarget::Hypr(Address::new(
            hypr_address.trim().to_string(),
        )));
    }

    Ok(LinuxWindowTarget::Hypr(Address::new(
        normalized.to_string(),
    )))
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
        match parse_window_target(&window_id)? {
            LinuxWindowTarget::Hypr(address) => {
                if !find_hypr_window(&address)? {
                    return Err(WindowSwitcherError::WindowNotFound(window_id));
                }

                focus_hypr_window(address)
            }
            LinuxWindowTarget::Sway(con_id) => {
                if !find_sway_window(con_id)? {
                    return Err(WindowSwitcherError::WindowNotFound(window_id));
                }
                focus_sway_window(con_id)
            }
        }
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
        match parse_window_target(&window_id)? {
            LinuxWindowTarget::Hypr(address) => {
                if !find_hypr_window(&address)? {
                    return Err(WindowSwitcherError::WindowNotFound(window_id));
                }

                close_hypr_window(address)
            }
            LinuxWindowTarget::Sway(con_id) => {
                if !find_sway_window(con_id)? {
                    return Err(WindowSwitcherError::WindowNotFound(window_id));
                }
                close_sway_window(con_id)
            }
        }
    }
}
