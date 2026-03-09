#[cfg(target_os = "linux")]
use swayipc::{Connection, Node, NodeType};

use crate::applications::icon_resolver::IconResolver;
use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{build_window_entry, FocusedWindowInfo, WindowProvider, SWAY_WINDOW_ID_PREFIX};

#[derive(Default)]
pub struct SwayWindowProvider;

#[cfg(target_os = "linux")]
fn open_connection() -> Result<Connection, String> {
    Connection::new().map_err(|error| format!("failed to connect to sway ipc: {error}"))
}

#[cfg(target_os = "linux")]
fn parse_tree() -> Result<Node, String> {
    open_connection()?
        .get_tree()
        .map_err(|error| format!("failed to read sway tree: {error}"))
}

#[cfg(target_os = "linux")]
fn node_class_name(node: &Node) -> String {
    if let Some(window_properties) = &node.window_properties {
        if let Some(class_name) = &window_properties.class {
            if !class_name.trim().is_empty() {
                return class_name.trim().to_string();
            }
        }
        if let Some(instance) = &window_properties.instance {
            if !instance.trim().is_empty() {
                return instance.trim().to_string();
            }
        }
    }
    node.app_id
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
}

#[cfg(target_os = "linux")]
fn node_title(node: &Node) -> String {
    node.name
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
}

#[cfg(target_os = "linux")]
fn collect_windows(
    node: &Node,
    workspace_name: &str,
    state: &AppState,
    icon_resolver: &mut IconResolver,
    entries: &mut Vec<WindowEntry>,
) {
    let next_workspace = if node.node_type == NodeType::Workspace {
        node_title(node)
    } else {
        workspace_name.to_string()
    };

    let class_name = node_class_name(node);
    let pid = node.pid.and_then(|value| u32::try_from(value).ok()).unwrap_or(0);
    if node.id > 0 && (!class_name.is_empty() || pid > 0) {
        entries.push(build_window_entry(
            state,
            icon_resolver,
            &format!("{SWAY_WINDOW_ID_PREFIX}{}", node.id),
            &node_title(node),
            &class_name,
            node.app_id.as_deref(),
            pid,
            &next_workspace,
            node.focused,
        ));
    }

    for child in &node.nodes {
        collect_windows(child, &next_workspace, state, icon_resolver, entries);
    }
    for child in &node.floating_nodes {
        collect_windows(child, &next_workspace, state, icon_resolver, entries);
    }
}

#[cfg(target_os = "linux")]
fn find_focused_window(node: &Node, workspace_name: &str, state: &AppState) -> Option<FocusedWindowInfo> {
    let next_workspace = if node.node_type == NodeType::Workspace {
        node_title(node)
    } else {
        workspace_name.to_string()
    };
    if node.focused && node.id > 0 {
        let class_name = node_class_name(node);
        let pid = node.pid.and_then(|value| u32::try_from(value).ok());
        return Some(FocusedWindowInfo {
            id: format!("{SWAY_WINDOW_ID_PREFIX}{}", node.id),
            title: node_title(node),
            app_name: super::app_name_from_entry(state, pid.unwrap_or(0), &class_name),
            class_name: class_name.clone(),
            app_id: node.app_id.clone(),
            pid,
            workspace: next_workspace,
            is_focused: true,
        });
    }

    for child in &node.nodes {
        if let Some(info) = find_focused_window(child, &next_workspace, state) {
            return Some(info);
        }
    }
    for child in &node.floating_nodes {
        if let Some(info) = find_focused_window(child, &next_workspace, state) {
            return Some(info);
        }
    }

    None
}

impl WindowProvider for SwayWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::Sway
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.desktop_environment == "sway" || env.compositor == "sway"
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>, String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = state;
            return Err("sway backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let tree = parse_tree()?;
            let mut icon_resolver = IconResolver::new();
            let mut entries = Vec::new();
            collect_windows(&tree, "", state, &mut icon_resolver, &mut entries);
            Ok(entries)
        }
    }

    fn focus_window(&self, window_id: &str) -> Result<(), String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = window_id;
            return Err("sway backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let con_id = window_id
                .trim()
                .strip_prefix(SWAY_WINDOW_ID_PREFIX)
                .unwrap_or(window_id)
                .trim();
            open_connection()?
                .run_command(&format!("[con_id={con_id}] focus"))
                .map_err(|error| format!("failed to focus sway window: {error}"))?;
            Ok(())
        }
    }

    fn close_window(&self, window_id: &str) -> Result<(), String> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = window_id;
            return Err("sway backend is only available on Linux".to_string());
        }

        #[cfg(target_os = "linux")]
        {
            let con_id = window_id
                .trim()
                .strip_prefix(SWAY_WINDOW_ID_PREFIX)
                .unwrap_or(window_id)
                .trim();
            open_connection()?
                .run_command(&format!("[con_id={con_id}] kill"))
                .map_err(|error| format!("failed to close sway window: {error}"))?;
            Ok(())
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
            let tree = parse_tree()?;
            Ok(find_focused_window(&tree, "", state))
        }
    }
}
