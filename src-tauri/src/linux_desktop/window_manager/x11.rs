use crate::applications::icon_resolver::IconResolver;
use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{build_window_entry, FocusedWindowInfo, WindowProvider};
use x11rb::atom_manager;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{
    AtomEnum, ClientMessageData, ClientMessageEvent, ConnectionExt, EventMask, Window,
    CLIENT_MESSAGE_EVENT,
};
use x11rb::rust_connection::RustConnection;
use x11rb::CURRENT_TIME;

atom_manager! {
    pub Atoms: AtomsCookie {
        _NET_ACTIVE_WINDOW,
        _NET_CLIENT_LIST,
        _NET_CLOSE_WINDOW,
        _NET_DESKTOP_NAMES,
        _NET_WM_DESKTOP,
        _NET_WM_NAME,
        _NET_WM_PID,
        UTF8_STRING,
        WM_CLASS,
        WM_NAME,
    }
}

#[derive(Default)]
pub struct X11WindowProvider;

fn open_connection() -> Result<(RustConnection, usize, Atoms), String> {
    let (connection, screen_num) =
        x11rb::connect(None).map_err(|error| format!("failed to connect to X11: {error}"))?;
    let atoms = Atoms::new(&connection)
        .map_err(|error| format!("failed to request X11 atoms: {error}"))?
        .reply()
        .map_err(|error| format!("failed to read X11 atoms: {error}"))?;
    Ok((connection, screen_num, atoms))
}

fn root_window(connection: &RustConnection, screen_num: usize) -> Window {
    connection.setup().roots[screen_num].root
}

fn read_property_bytes(
    connection: &RustConnection,
    window: Window,
    property: u32,
    property_type: u32,
) -> Result<Vec<u8>, String> {
    connection
        .get_property(false, window, property, property_type, 0, u32::MAX)
        .map_err(|error| format!("failed to read X11 property {property}: {error}"))?
        .reply()
        .map_err(|error| format!("failed to read X11 property reply {property}: {error}"))
        .map(|reply| reply.value)
}

fn read_property_u32(
    connection: &RustConnection,
    window: Window,
    property: u32,
    property_type: u32,
) -> Result<Vec<u32>, String> {
    let reply = connection
        .get_property(false, window, property, property_type, 0, u32::MAX)
        .map_err(|error| format!("failed to read X11 property {property}: {error}"))?
        .reply()
        .map_err(|error| format!("failed to read X11 property reply {property}: {error}"))?;
    Ok(reply.value32().map(|items| items.collect()).unwrap_or_default())
}

fn parse_title(connection: &RustConnection, atoms: &Atoms, window: Window) -> String {
    read_property_bytes(connection, window, atoms._NET_WM_NAME, atoms.UTF8_STRING)
        .or_else(|_| read_property_bytes(connection, window, atoms.WM_NAME, AtomEnum::STRING.into()))
        .ok()
        .map(|bytes| String::from_utf8_lossy(&bytes).trim_matches('\0').trim().to_string())
        .unwrap_or_default()
}

fn parse_class_name(connection: &RustConnection, atoms: &Atoms, window: Window) -> String {
    read_property_bytes(connection, window, atoms.WM_CLASS, AtomEnum::STRING.into())
        .ok()
        .map(|bytes| {
            bytes
                .split(|byte| *byte == 0)
                .filter_map(|part| std::str::from_utf8(part).ok())
                .map(str::trim)
                .filter(|part| !part.is_empty())
                .last()
                .unwrap_or_default()
                .to_string()
        })
        .unwrap_or_default()
}

fn parse_pid(connection: &RustConnection, atoms: &Atoms, window: Window) -> u32 {
    read_property_u32(connection, window, atoms._NET_WM_PID, AtomEnum::CARDINAL.into())
        .ok()
        .and_then(|values| values.into_iter().next())
        .unwrap_or(0)
}

fn workspace_names(connection: &RustConnection, root: Window, atoms: &Atoms) -> Vec<String> {
    read_property_bytes(connection, root, atoms._NET_DESKTOP_NAMES, atoms.UTF8_STRING)
        .ok()
        .map(|bytes| {
            bytes
                .split(|byte| *byte == 0)
                .filter_map(|part| std::str::from_utf8(part).ok())
                .map(str::trim)
                .filter(|part| !part.is_empty())
                .map(|part| part.to_string())
                .collect()
        })
        .unwrap_or_default()
}

fn workspace_name_for_window(
    connection: &RustConnection,
    atoms: &Atoms,
    window: Window,
    workspace_names: &[String],
) -> String {
    let index = read_property_u32(connection, window, atoms._NET_WM_DESKTOP, AtomEnum::CARDINAL.into())
        .ok()
        .and_then(|values| values.into_iter().next())
        .unwrap_or(0) as usize;

    workspace_names
        .get(index)
        .cloned()
        .unwrap_or_else(|| index.to_string())
}

fn active_window(connection: &RustConnection, root: Window, atoms: &Atoms) -> Result<Option<Window>, String> {
    Ok(
        read_property_u32(connection, root, atoms._NET_ACTIVE_WINDOW, AtomEnum::WINDOW.into())?
            .into_iter()
            .next(),
    )
}

fn send_root_client_message(
    connection: &RustConnection,
    root: Window,
    window: Window,
    message_type: u32,
    data: [u32; 5],
) -> Result<(), String> {
    let event = ClientMessageEvent {
        response_type: CLIENT_MESSAGE_EVENT,
        format: 32,
        sequence: 0,
        window,
        type_: message_type,
        data: ClientMessageData::from(data),
    };

    connection
        .send_event(
            false,
            root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            event,
        )
        .map_err(|error| format!("failed to send X11 client message: {error}"))?;
    connection
        .flush()
        .map_err(|error| format!("failed to flush X11 connection: {error}"))
}

fn parse_window_id(window_id: &str) -> Result<Window, String> {
    let normalized = window_id.trim();
    if let Some(hex) = normalized.strip_prefix("0x") {
        u32::from_str_radix(hex, 16).map_err(|_| "invalid X11 window id".to_string())
    } else {
        normalized
            .parse::<u32>()
            .map_err(|_| "invalid X11 window id".to_string())
    }
}

impl WindowProvider for X11WindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::X11Ewmh
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.session_type == "x11" && open_connection().is_ok()
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::standard_with_close()
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>, String> {
        let (connection, screen_num, atoms) = open_connection()?;
        let root = root_window(&connection, screen_num);
        let active = active_window(&connection, root, &atoms)?;
        let names = workspace_names(&connection, root, &atoms);
        let mut icon_resolver = IconResolver::new();
        let mut entries = Vec::new();

        for window in read_property_u32(&connection, root, atoms._NET_CLIENT_LIST, AtomEnum::WINDOW.into())? {
            let title = parse_title(&connection, &atoms, window);
            if title.trim().is_empty() {
                continue;
            }

            let class_name = parse_class_name(&connection, &atoms, window);
            let pid = parse_pid(&connection, &atoms, window);
            let workspace = workspace_name_for_window(&connection, &atoms, window, &names);

            entries.push(build_window_entry(
                state,
                &mut icon_resolver,
                &window.to_string(),
                &title,
                &class_name,
                None,
                pid,
                &workspace,
                Some(window) == active,
            ));
        }

        Ok(entries)
    }

    fn focus_window(&self, window_id: &str) -> Result<(), String> {
        let (connection, screen_num, atoms) = open_connection()?;
        let root = root_window(&connection, screen_num);
        let window = parse_window_id(window_id)?;
        send_root_client_message(
            &connection,
            root,
            window,
            atoms._NET_ACTIVE_WINDOW,
            [1, CURRENT_TIME, 0, 0, 0],
        )
    }

    fn close_window(&self, window_id: &str) -> Result<(), String> {
        let (connection, screen_num, atoms) = open_connection()?;
        let root = root_window(&connection, screen_num);
        let window = parse_window_id(window_id)?;
        send_root_client_message(
            &connection,
            root,
            window,
            atoms._NET_CLOSE_WINDOW,
            [CURRENT_TIME, 1, 0, 0, 0],
        )
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
        let (connection, screen_num, atoms) = open_connection()?;
        let root = root_window(&connection, screen_num);
        let Some(window) = active_window(&connection, root, &atoms)? else {
            return Ok(None);
        };

        let title = parse_title(&connection, &atoms, window);
        let class_name = parse_class_name(&connection, &atoms, window);
        let pid = parse_pid(&connection, &atoms, window);
        let names = workspace_names(&connection, root, &atoms);
        let workspace = workspace_name_for_window(&connection, &atoms, window, &names);

        Ok(Some(FocusedWindowInfo {
            id: window.to_string(),
            title,
            app_name: super::app_name_from_entry(state, pid, &class_name),
            class_name,
            app_id: None,
            pid: (pid > 0).then_some(pid),
            workspace,
            is_focused: true,
        }))
    }
}
