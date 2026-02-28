use tauri::State;

use swayipc::{Connection, Node, NodeType};

use crate::{applications::icon_resolver::IconResolver, state::AppState};

use super::super::{
    app_name_from_entry, resolve_icon_path, Result, WindowEntry, WindowSwitcherError,
};

fn open_connection() -> Result<Connection> {
    Connection::new().map_err(|error| {
        WindowSwitcherError::ClientError(format!("failed to connect to sway ipc: {error}"))
    })
}

fn parse_sway_tree() -> Result<Node> {
    let mut connection = open_connection()?;
    connection.get_tree().map_err(|error| {
        WindowSwitcherError::ClientError(format!("failed to fetch sway tree: {error}"))
    })
}

fn node_class_name(node: &Node) -> String {
    if let Some(window_properties) = &node.window_properties {
        if let Some(class_name) = &window_properties.class {
            let normalized = class_name.trim();
            if !normalized.is_empty() {
                return normalized.to_string();
            }
        }

        if let Some(instance) = &window_properties.instance {
            let normalized = instance.trim();
            if !normalized.is_empty() {
                return normalized.to_string();
            }
        }
    }

    if let Some(app_id) = &node.app_id {
        let normalized = app_id.trim();
        if !normalized.is_empty() {
            return normalized.to_string();
        }
    }

    String::new()
}

fn node_title(node: &Node) -> String {
    node.name
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
}

fn collect_sway_windows(
    node: &Node,
    workspace_name: &str,
    state: &State<'_, AppState>,
    icon_resolver: &mut IconResolver,
    windows: &mut Vec<WindowEntry>,
) {
    let next_workspace = if node.node_type == NodeType::Workspace {
        node_title(node)
    } else {
        workspace_name.to_string()
    };

    let con_id = node.id;
    let pid = node
        .pid
        .and_then(|value| u32::try_from(value).ok())
        .unwrap_or(0);
    let focused = node.focused;
    let class_name = node_class_name(node);
    let title = node_title(node);
    let has_window_identity = !class_name.is_empty() || pid > 0;

    if con_id > 0 && has_window_identity {
        let app_name = app_name_from_entry(state, pid, &class_name);
        let app_icon = resolve_icon_path(icon_resolver, &app_name, &class_name);

        windows.push(WindowEntry {
            id: format!("{}{con_id}", super::super::SWAY_WINDOW_ID_PREFIX),
            title,
            app_name,
            app_icon,
            workspace: next_workspace.clone(),
            is_focused: focused,
        });
    }

    for child in &node.nodes {
        collect_sway_windows(child, &next_workspace, state, icon_resolver, windows);
    }

    for child in &node.floating_nodes {
        collect_sway_windows(child, &next_workspace, state, icon_resolver, windows);
    }
}

fn sway_tree_contains_con_id(node: &Node, con_id: i64) -> bool {
    if node.id == con_id {
        return true;
    }

    for child in &node.nodes {
        if sway_tree_contains_con_id(child, con_id) {
            return true;
        }
    }

    for child in &node.floating_nodes {
        if sway_tree_contains_con_id(child, con_id) {
            return true;
        }
    }

    false
}

fn run_sway_command(command: &str) -> Result<()> {
    let mut connection = open_connection()?;
    let outcomes = connection.run_command(command).map_err(|error| {
        WindowSwitcherError::ClientError(format!("failed to run sway command: {error}"))
    })?;

    if outcomes.iter().all(|entry| entry.is_ok()) {
        return Ok(());
    }

    let error_message = outcomes
        .iter()
        .find_map(|entry| entry.as_ref().err())
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| format!("sway command failed: {command}"));

    Err(WindowSwitcherError::ClientError(error_message))
}

pub(crate) fn list_sway_windows(
    state: &State<'_, AppState>,
    icon_resolver: &mut IconResolver,
) -> Result<Vec<WindowEntry>> {
    let tree = parse_sway_tree()?;
    let mut windows = Vec::new();
    collect_sway_windows(&tree, "", state, icon_resolver, &mut windows);
    Ok(windows)
}

pub(crate) fn find_sway_window(con_id: i64) -> Result<bool> {
    let tree = parse_sway_tree()?;
    Ok(sway_tree_contains_con_id(&tree, con_id))
}

pub(crate) fn focus_sway_window(con_id: i64) -> Result<()> {
    run_sway_command(&format!("[con_id={con_id}] focus"))
}

pub(crate) fn close_sway_window(con_id: i64) -> Result<()> {
    run_sway_command(&format!("[con_id={con_id}] kill"))
}
