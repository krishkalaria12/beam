#[cfg(target_os = "linux")]
use hyprland::{
    data::Clients,
    dispatch::{Dispatch, DispatchType, WindowIdentifier as HyprIdentifier},
    shared::{Address, HyprData as _},
};

use crate::applications::icon_resolver::IconResolver;
use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{build_window_entry, FocusedWindowInfo, WindowProvider, HYPR_WINDOW_ID_PREFIX};

#[derive(Default)]
pub struct HyprlandWindowProvider;

impl WindowProvider for HyprlandWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::Hyprland
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "hyprland" || env.compositor == "hyprland"
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>, String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = state;
            return Err("hyprland backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let clients = Clients::get().map_err(|error| error.to_string())?;
            let mut icon_resolver = IconResolver::new();
            let entries = clients
                .iter()
                .map(|entry| {
                    build_window_entry(
                        state,
                        &mut icon_resolver,
                        &format!("{HYPR_WINDOW_ID_PREFIX}{}", entry.address),
                        entry.title.trim(),
                        &entry.class,
                        None,
                        entry.pid as u32,
                        entry.workspace.name.trim(),
                        entry.focus_history_id == 0,
                    )
                })
                .collect();

            Ok(entries)
        }
    }

    fn focus_window(&self, window_id: &str) -> Result<(), String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = window_id;
            return Err("hyprland backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let address = window_id
                .trim()
                .strip_prefix(HYPR_WINDOW_ID_PREFIX)
                .unwrap_or(window_id)
                .trim();
            Dispatch::call(DispatchType::FocusWindow(HyprIdentifier::Address(
                Address::new(address.to_string()),
            )))
            .map_err(|error| error.to_string())
        }
    }

    fn close_window(&self, window_id: &str) -> Result<(), String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = window_id;
            return Err("hyprland backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let address = window_id
                .trim()
                .strip_prefix(HYPR_WINDOW_ID_PREFIX)
                .unwrap_or(window_id)
                .trim();
            Dispatch::call(DispatchType::CloseWindow(HyprIdentifier::Address(
                Address::new(address.to_string()),
            )))
            .map_err(|error| error.to_string())
        }
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = state;
            return Ok(None);
        }

        #[cfg(target_os = "linux")]
        {
            let clients = Clients::get().map_err(|error| error.to_string())?;
            let Some(entry) = clients.iter().find(|client| client.focus_history_id == 0) else {
                return Ok(None);
            };

            Ok(Some(FocusedWindowInfo {
                id: format!("{HYPR_WINDOW_ID_PREFIX}{}", entry.address),
                title: entry.title.trim().to_string(),
                app_name: super::app_name_from_entry(state, entry.pid as u32, &entry.class),
                class_name: entry.class.trim().to_string(),
                app_id: Some(entry.class.trim().to_string()),
                pid: Some(entry.pid as u32),
                workspace: entry.workspace.name.trim().to_string(),
                is_focused: true,
            }))
        }
    }
}
