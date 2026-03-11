pub mod error;

mod fallback;
mod gnome;
mod hyprland;
mod kde;
mod sway;
mod wayland;
mod x11;

use serde::{Deserialize, Serialize};

use crate::applications::icon_resolver::IconResolver;
use crate::config::config;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use self::error::Result;
use self::fallback::UnsupportedWindowProvider;
use self::gnome::GnomeWindowProvider;
use self::hyprland::HyprlandWindowProvider;
use self::kde::KdeWindowProvider;
use self::sway::SwayWindowProvider;
use self::wayland::GenericWaylandWindowProvider;
use self::x11::X11WindowProvider;
use super::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use super::environment::{detect_environment, LinuxDesktopEnvironment};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusedWindowInfo {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub class_name: String,
    pub app_id: Option<String>,
    pub pid: Option<u32>,
    pub workspace: String,
    pub is_focused: bool,
}

pub trait WindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind;
    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool;
    fn capabilities(&self) -> WindowBackendCapabilities;
    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>>;
    fn focus_window(&self, window_id: &str) -> Result<()>;
    fn close_window(&self, window_id: &str) -> Result<()>;
    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>>;
}

fn select_provider(env: &LinuxDesktopEnvironment) -> Box<dyn WindowProvider> {
    let candidates: Vec<Box<dyn WindowProvider>> = vec![
        Box::<HyprlandWindowProvider>::default(),
        Box::<SwayWindowProvider>::default(),
        Box::<GnomeWindowProvider>::default(),
        Box::<KdeWindowProvider>::default(),
        Box::<GenericWaylandWindowProvider>::default(),
        Box::<X11WindowProvider>::default(),
    ];

    for candidate in candidates {
        if candidate.is_activatable(env) {
            return candidate;
        }
    }

    Box::<UnsupportedWindowProvider>::default()
}

pub fn active_backend_kind() -> DesktopBackendKind {
    let env = detect_environment();
    select_provider(&env).backend_kind()
}

pub fn active_capabilities() -> WindowBackendCapabilities {
    let env = detect_environment();
    select_provider(&env).capabilities()
}

pub fn list_windows(state: &AppState) -> Result<Vec<WindowEntry>> {
    let env = detect_environment();
    select_provider(&env).list_windows(state)
}

pub fn focus_window(window_id: &str) -> Result<()> {
    let env = detect_environment();
    select_provider(&env).focus_window(window_id)
}

pub fn close_window(window_id: &str) -> Result<()> {
    let env = detect_environment();
    select_provider(&env).close_window(window_id)
}

pub fn frontmost_window(state: &AppState) -> Result<Option<FocusedWindowInfo>> {
    let env = detect_environment();
    select_provider(&env).frontmost_window(state)
}

pub(crate) fn app_name_from_entry(state: &AppState, pid: u32, class_name: &str) -> String {
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

pub(crate) fn resolve_icon_path(
    icon_resolver: &mut IconResolver,
    app_name: &str,
    class_name: &str,
) -> String {
    let class_lower = class_name.trim().to_lowercase();
    for candidate in [app_name.trim(), class_name.trim(), class_lower.as_str()] {
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

pub(crate) fn build_window_entry(
    state: &AppState,
    icon_resolver: &mut IconResolver,
    id: &str,
    title: &str,
    class_name: &str,
    app_id: Option<&str>,
    pid: u32,
    workspace: &str,
    is_focused: bool,
) -> WindowEntry {
    let effective_class = if !class_name.trim().is_empty() {
        class_name.trim()
    } else {
        app_id.unwrap_or("")
    };
    let app_name = app_name_from_entry(state, pid, effective_class);
    let app_icon = resolve_icon_path(icon_resolver, &app_name, effective_class);

    WindowEntry {
        id: id.trim().to_string(),
        title: title.trim().to_string(),
        app_name,
        app_icon,
        workspace: workspace.trim().to_string(),
        is_focused,
    }
}

pub(crate) fn hypr_window_id_prefix() -> &'static str {
    config().LINUX_DESKTOP_HYPR_WINDOW_ID_PREFIX
}

pub(crate) fn sway_window_id_prefix() -> &'static str {
    config().LINUX_DESKTOP_SWAY_WINDOW_ID_PREFIX
}
