use std::collections::HashMap;
use std::thread;

use crossbeam_channel::{unbounded, Receiver, Sender};
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use wayland_client::{
    event_created_child,
    globals::{registry_queue_init, GlobalListContents},
    protocol::{wl_registry, wl_seat::WlSeat},
    Connection, Dispatch, EventQueue, Proxy, QueueHandle,
};
use wayland_protocols::ext::foreign_toplevel_list::v1::client::{
    ext_foreign_toplevel_handle_v1::{self, ExtForeignToplevelHandleV1},
    ext_foreign_toplevel_list_v1::{self, ExtForeignToplevelListV1},
};
use wayland_protocols_wlr::foreign_toplevel::v1::client::{
    zwlr_foreign_toplevel_handle_v1::{self, ZwlrForeignToplevelHandleV1},
    zwlr_foreign_toplevel_manager_v1::{self, ZwlrForeignToplevelManagerV1},
};

use crate::applications::icon_resolver::IconResolver;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::super::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use super::super::environment::LinuxDesktopEnvironment;
use super::error::{Result, WindowManagerError};
use super::{build_window_entry, FocusedWindowInfo, WindowProvider};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WaylandProtocolMode {
    Wlr,
    Ext,
}

#[derive(Debug, Clone, Default)]
struct WaylandWindowState {
    id: String,
    title: String,
    app_id: String,
    active: bool,
}

fn object_id(proxy: &impl Proxy, conn: &Connection) -> Option<u32> {
    conn.object_info(proxy.id()).ok().map(|info| info.id)
}

struct WlrWindowRecord {
    public_id: String,
    title: String,
    app_id: String,
    active: bool,
    handle: ZwlrForeignToplevelHandleV1,
}

impl WlrWindowRecord {
    fn new(id: u32, handle: ZwlrForeignToplevelHandleV1) -> Self {
        Self {
            public_id: format!("wayland:{id}"),
            title: String::new(),
            app_id: String::new(),
            active: false,
            handle,
        }
    }

    fn snapshot(&self) -> WaylandWindowState {
        WaylandWindowState {
            id: self.public_id.clone(),
            title: self.title.clone(),
            app_id: self.app_id.clone(),
            active: self.active,
        }
    }
}

#[derive(Default)]
struct WlrSessionState {
    windows: HashMap<u32, WlrWindowRecord>,
}

impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for WlrSessionState {
    fn event(
        _state: &mut Self,
        _proxy: &wl_registry::WlRegistry,
        _event: wl_registry::Event,
        _data: &GlobalListContents,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
    }
}

impl Dispatch<WlSeat, ()> for WlrSessionState {
    fn event(
        _state: &mut Self,
        _proxy: &WlSeat,
        _event: wayland_client::protocol::wl_seat::Event,
        _data: &(),
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
    }
}

impl Dispatch<ZwlrForeignToplevelManagerV1, ()> for WlrSessionState {
    fn event(
        state: &mut Self,
        _proxy: &ZwlrForeignToplevelManagerV1,
        event: zwlr_foreign_toplevel_manager_v1::Event,
        _data: &(),
        conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        if let zwlr_foreign_toplevel_manager_v1::Event::Toplevel { toplevel } = event {
            if let Some(id) = object_id(&toplevel, conn) {
                state
                    .windows
                    .entry(id)
                    .or_insert_with(|| WlrWindowRecord::new(id, toplevel.clone()));
            }
        }
    }
}

mod wlr_child_dispatch {
    use super::*;

    event_created_child!(WlrSessionState, ZwlrForeignToplevelManagerV1, [
        zwlr_foreign_toplevel_manager_v1::EVT_TOPLEVEL_OPCODE => (ZwlrForeignToplevelHandleV1, ())
    ]);
}

impl Dispatch<ZwlrForeignToplevelHandleV1, ()> for WlrSessionState {
    fn event(
        state: &mut Self,
        proxy: &ZwlrForeignToplevelHandleV1,
        event: zwlr_foreign_toplevel_handle_v1::Event,
        _data: &(),
        conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        let Some(id) = object_id(proxy, conn) else {
            return;
        };
        let Some(entry) = state.windows.get_mut(&id) else {
            return;
        };

        match event {
            zwlr_foreign_toplevel_handle_v1::Event::Title { title } => {
                entry.title = title.trim().to_string();
            }
            zwlr_foreign_toplevel_handle_v1::Event::AppId { app_id } => {
                entry.app_id = app_id.trim().to_string();
            }
            zwlr_foreign_toplevel_handle_v1::Event::State { state: raw_state } => {
                entry.active = raw_state
                    .chunks_exact(4)
                    .map(|chunk| u32::from_ne_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                    .any(|flag| flag == 2);
            }
            zwlr_foreign_toplevel_handle_v1::Event::Closed => {
                if let Some(entry) = state.windows.remove(&id) {
                    entry.handle.destroy();
                }
            }
            _ => {}
        }
    }
}

struct WlrSession {
    conn: Connection,
    queue: EventQueue<WlrSessionState>,
    state: WlrSessionState,
    _manager: ZwlrForeignToplevelManagerV1,
    seat: Option<WlSeat>,
}

impl WlrSession {
    fn connect() -> Result<Self> {
        let conn = Connection::connect_to_env().map_err(|error| {
            WindowManagerError::ConnectionError(format!("failed to connect to Wayland: {error}"))
        })?;
        let (globals, queue) = registry_queue_init::<WlrSessionState>(&conn).map_err(
            |error| {
                WindowManagerError::ConnectionError(format!(
                    "failed to enumerate Wayland globals: {error}"
                ))
            },
        )?;
        let qh = queue.handle();
        let manager = globals
            .bind::<ZwlrForeignToplevelManagerV1, _, _>(&qh, 1..=3, ())
            .map_err(|_| {
                WindowManagerError::UnsupportedSession(
                    "Wayland compositor does not expose zwlr_foreign_toplevel_manager_v1"
                        .to_string(),
                )
            })?;
        let seat = globals.bind::<WlSeat, _, _>(&qh, 1..=9, ()).ok();

        let mut session = Self {
            conn,
            queue,
            state: WlrSessionState::default(),
            _manager: manager,
            seat,
        };
        session.sync_initial()?;
        Ok(session)
    }

    fn sync_initial(&mut self) -> Result<()> {
        self.queue.roundtrip(&mut self.state).map_err(|error| {
            WindowManagerError::QueryError(format!(
                "failed to initialize Wayland toplevel session: {error}"
            ))
        })?;
        self.sync()
    }

    fn sync(&mut self) -> Result<()> {
        self.queue.roundtrip(&mut self.state).map_err(|error| {
            WindowManagerError::QueryError(format!("failed to query Wayland toplevels: {error}"))
        })?;
        Ok(())
    }

    fn snapshot(&mut self) -> Result<Vec<WaylandWindowState>> {
        self.sync()?;
        Ok(self
            .state
            .windows
            .values()
            .map(WlrWindowRecord::snapshot)
            .collect())
    }

    fn focus_window(&mut self, window_id: &str) -> Result<()> {
        self.sync()?;
        let seat = self.seat.as_ref().ok_or_else(|| {
            WindowManagerError::BackendUnavailable(
                "generic Wayland focus requires a compositor seat".to_string(),
            )
        })?;
        let handle = self
            .state
            .windows
            .values()
            .find(|window| window.public_id == window_id)
            .map(|window| window.handle.clone())
            .ok_or_else(|| {
                WindowManagerError::InvalidWindowId(format!(
                    "could not find generic Wayland window '{window_id}'"
                ))
            })?;

        handle.activate(seat);
        self.conn.flush().map_err(|error| {
            WindowManagerError::CommandError(format!(
                "failed to send Wayland activate request: {error}"
            ))
        })?;
        self.sync()
    }

    fn close_window(&mut self, window_id: &str) -> Result<()> {
        self.sync()?;
        let handle = self
            .state
            .windows
            .values()
            .find(|window| window.public_id == window_id)
            .map(|window| window.handle.clone())
            .ok_or_else(|| {
                WindowManagerError::InvalidWindowId(format!(
                    "could not find generic Wayland window '{window_id}'"
                ))
            })?;

        handle.close();
        self.conn.flush().map_err(|error| {
            WindowManagerError::CommandError(format!(
                "failed to send Wayland close request: {error}"
            ))
        })?;
        self.sync()
    }
}

struct ExtWindowRecord {
    public_id: String,
    title: String,
    app_id: String,
    handle: ExtForeignToplevelHandleV1,
}

impl ExtWindowRecord {
    fn new(id: u32, handle: ExtForeignToplevelHandleV1) -> Self {
        Self {
            public_id: format!("wayland:{id}"),
            title: String::new(),
            app_id: String::new(),
            handle,
        }
    }

    fn snapshot(&self) -> WaylandWindowState {
        WaylandWindowState {
            id: self.public_id.clone(),
            title: self.title.clone(),
            app_id: self.app_id.clone(),
            active: false,
        }
    }
}

#[derive(Default)]
struct ExtSessionState {
    windows: HashMap<u32, ExtWindowRecord>,
}

impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for ExtSessionState {
    fn event(
        _state: &mut Self,
        _proxy: &wl_registry::WlRegistry,
        _event: wl_registry::Event,
        _data: &GlobalListContents,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
    }
}

impl Dispatch<ExtForeignToplevelListV1, ()> for ExtSessionState {
    fn event(
        state: &mut Self,
        _proxy: &ExtForeignToplevelListV1,
        event: ext_foreign_toplevel_list_v1::Event,
        _data: &(),
        conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        if let ext_foreign_toplevel_list_v1::Event::Toplevel { toplevel } = event {
            if let Some(id) = object_id(&toplevel, conn) {
                state
                    .windows
                    .entry(id)
                    .or_insert_with(|| ExtWindowRecord::new(id, toplevel.clone()));
            }
        }
    }
}

mod ext_child_dispatch {
    use super::*;

    event_created_child!(ExtSessionState, ExtForeignToplevelListV1, [
        ext_foreign_toplevel_list_v1::EVT_TOPLEVEL_OPCODE => (ExtForeignToplevelHandleV1, ())
    ]);
}

impl Dispatch<ExtForeignToplevelHandleV1, ()> for ExtSessionState {
    fn event(
        state: &mut Self,
        proxy: &ExtForeignToplevelHandleV1,
        event: ext_foreign_toplevel_handle_v1::Event,
        _data: &(),
        conn: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        let Some(id) = object_id(proxy, conn) else {
            return;
        };
        let Some(entry) = state.windows.get_mut(&id) else {
            return;
        };

        match event {
            ext_foreign_toplevel_handle_v1::Event::Identifier { identifier } => {
                let identifier = identifier.trim();
                if !identifier.is_empty() {
                    entry.public_id = identifier.to_string();
                }
            }
            ext_foreign_toplevel_handle_v1::Event::Title { title } => {
                entry.title = title.trim().to_string();
            }
            ext_foreign_toplevel_handle_v1::Event::AppId { app_id } => {
                entry.app_id = app_id.trim().to_string();
            }
            ext_foreign_toplevel_handle_v1::Event::Closed => {
                if let Some(entry) = state.windows.remove(&id) {
                    entry.handle.destroy();
                }
            }
            _ => {}
        }
    }
}

struct ExtSession {
    _conn: Connection,
    queue: EventQueue<ExtSessionState>,
    state: ExtSessionState,
    _list: ExtForeignToplevelListV1,
}

impl ExtSession {
    fn connect() -> Result<Self> {
        let conn = Connection::connect_to_env().map_err(|error| {
            WindowManagerError::ConnectionError(format!("failed to connect to Wayland: {error}"))
        })?;
        let (globals, queue) = registry_queue_init::<ExtSessionState>(&conn).map_err(
            |error| {
                WindowManagerError::ConnectionError(format!(
                    "failed to enumerate Wayland globals: {error}"
                ))
            },
        )?;
        let qh = queue.handle();
        let list = globals
            .bind::<ExtForeignToplevelListV1, _, _>(&qh, 1..=1, ())
            .map_err(|_| {
                WindowManagerError::UnsupportedSession(
                    "Wayland compositor does not expose ext_foreign_toplevel_list_v1".to_string(),
                )
            })?;

        let mut session = Self {
            _conn: conn,
            queue,
            state: ExtSessionState::default(),
            _list: list,
        };
        session.sync_initial()?;
        Ok(session)
    }

    fn sync_initial(&mut self) -> Result<()> {
        self.queue.roundtrip(&mut self.state).map_err(|error| {
            WindowManagerError::QueryError(format!(
                "failed to initialize ext Wayland toplevel session: {error}"
            ))
        })?;
        self.sync()
    }

    fn sync(&mut self) -> Result<()> {
        self.queue.roundtrip(&mut self.state).map_err(|error| {
            WindowManagerError::QueryError(format!("failed to query ext Wayland toplevels: {error}"))
        })?;
        Ok(())
    }

    fn snapshot(&mut self) -> Result<Vec<WaylandWindowState>> {
        self.sync()?;
        Ok(self
            .state
            .windows
            .values()
            .map(ExtWindowRecord::snapshot)
            .collect())
    }
}

enum WorkerSession {
    Wlr(WlrSession),
    Ext(ExtSession),
    Unsupported(String),
}

impl WorkerSession {
    fn connect() -> Self {
        match WlrSession::connect() {
            Ok(session) => Self::Wlr(session),
            Err(wlr_error) => match ExtSession::connect() {
                Ok(session) => Self::Ext(session),
                Err(ext_error) => Self::Unsupported(format!(
                    "{}; {}",
                    wlr_error, ext_error
                )),
            },
        }
    }

    fn mode(&self) -> Result<WaylandProtocolMode> {
        match self {
            Self::Wlr(_) => Ok(WaylandProtocolMode::Wlr),
            Self::Ext(_) => Ok(WaylandProtocolMode::Ext),
            Self::Unsupported(error) => Err(WindowManagerError::UnsupportedSession(error.clone())),
        }
    }

    fn snapshot(&mut self) -> Result<(WaylandProtocolMode, Vec<WaylandWindowState>)> {
        match self {
            Self::Wlr(session) => Ok((WaylandProtocolMode::Wlr, session.snapshot()?)),
            Self::Ext(session) => Ok((WaylandProtocolMode::Ext, session.snapshot()?)),
            Self::Unsupported(error) => Err(WindowManagerError::UnsupportedSession(error.clone())),
        }
    }

    fn focus_window(&mut self, window_id: &str) -> Result<()> {
        match self {
            Self::Wlr(session) => session.focus_window(window_id),
            Self::Ext(_) => Err(WindowManagerError::BackendUnavailable(
                "generic Wayland focus is not supported by ext_foreign_toplevel_list_v1"
                    .to_string(),
            )),
            Self::Unsupported(error) => Err(WindowManagerError::UnsupportedSession(error.clone())),
        }
    }

    fn close_window(&mut self, window_id: &str) -> Result<()> {
        match self {
            Self::Wlr(session) => session.close_window(window_id),
            Self::Ext(_) => Err(WindowManagerError::BackendUnavailable(
                "generic Wayland close is not supported by ext_foreign_toplevel_list_v1"
                    .to_string(),
            )),
            Self::Unsupported(error) => Err(WindowManagerError::UnsupportedSession(error.clone())),
        }
    }
}

enum RuntimeRequest {
    Detect {
        reply: Sender<Result<WaylandProtocolMode>>,
    },
    Snapshot {
        reply: Sender<Result<(WaylandProtocolMode, Vec<WaylandWindowState>)>>,
    },
    Focus {
        window_id: String,
        reply: Sender<Result<()>>,
    },
    Close {
        window_id: String,
        reply: Sender<Result<()>>,
    },
}

fn run_worker(receiver: Receiver<RuntimeRequest>) {
    let mut session = WorkerSession::connect();

    while let Ok(request) = receiver.recv() {
        match request {
            RuntimeRequest::Detect { reply } => {
                let _ = reply.send(session.mode());
            }
            RuntimeRequest::Snapshot { reply } => {
                let _ = reply.send(session.snapshot());
            }
            RuntimeRequest::Focus { window_id, reply } => {
                let _ = reply.send(session.focus_window(&window_id));
            }
            RuntimeRequest::Close { window_id, reply } => {
                let _ = reply.send(session.close_window(&window_id));
            }
        }
    }
}

#[derive(Default)]
struct WaylandRuntime {
    sender: Option<Sender<RuntimeRequest>>,
}

impl WaylandRuntime {
    fn ensure_worker(&mut self) -> Sender<RuntimeRequest> {
        if let Some(sender) = &self.sender {
            return sender.clone();
        }

        let (sender, receiver) = unbounded();
        thread::Builder::new()
            .name("beam-wayland-window-session".to_string())
            .spawn(move || run_worker(receiver))
            .expect("failed to spawn generic Wayland session worker");
        self.sender = Some(sender.clone());
        sender
    }

    fn detect(&mut self) -> Result<WaylandProtocolMode> {
        for _ in 0..2 {
            let sender = self.ensure_worker();
            let (reply_tx, reply_rx) = unbounded();
            if sender.send(RuntimeRequest::Detect { reply: reply_tx }).is_err() {
                self.sender = None;
                continue;
            }
            match reply_rx.recv() {
                Ok(result) => return result,
                Err(_) => self.sender = None,
            }
        }

        Err(WindowManagerError::ConnectionError(
            "generic Wayland window session worker exited unexpectedly".to_string(),
        ))
    }

    fn snapshot(&mut self) -> Result<(WaylandProtocolMode, Vec<WaylandWindowState>)> {
        for _ in 0..2 {
            let sender = self.ensure_worker();
            let (reply_tx, reply_rx) = unbounded();
            if sender
                .send(RuntimeRequest::Snapshot { reply: reply_tx })
                .is_err()
            {
                self.sender = None;
                continue;
            }
            match reply_rx.recv() {
                Ok(result) => return result,
                Err(_) => self.sender = None,
            }
        }

        Err(WindowManagerError::ConnectionError(
            "generic Wayland window session worker exited unexpectedly".to_string(),
        ))
    }

    fn focus_window(&mut self, window_id: &str) -> Result<()> {
        for _ in 0..2 {
            let sender = self.ensure_worker();
            let (reply_tx, reply_rx) = unbounded();
            if sender
                .send(RuntimeRequest::Focus {
                    window_id: window_id.to_string(),
                    reply: reply_tx,
                })
                .is_err()
            {
                self.sender = None;
                continue;
            }
            match reply_rx.recv() {
                Ok(result) => return result,
                Err(_) => self.sender = None,
            }
        }

        Err(WindowManagerError::ConnectionError(
            "generic Wayland window session worker exited unexpectedly".to_string(),
        ))
    }

    fn close_window(&mut self, window_id: &str) -> Result<()> {
        for _ in 0..2 {
            let sender = self.ensure_worker();
            let (reply_tx, reply_rx) = unbounded();
            if sender
                .send(RuntimeRequest::Close {
                    window_id: window_id.to_string(),
                    reply: reply_tx,
                })
                .is_err()
            {
                self.sender = None;
                continue;
            }
            match reply_rx.recv() {
                Ok(result) => return result,
                Err(_) => self.sender = None,
            }
        }

        Err(WindowManagerError::ConnectionError(
            "generic Wayland window session worker exited unexpectedly".to_string(),
        ))
    }
}

static WAYLAND_RUNTIME: Lazy<Mutex<WaylandRuntime>> =
    Lazy::new(|| Mutex::new(WaylandRuntime::default()));

fn detect_mode() -> Result<WaylandProtocolMode> {
    WAYLAND_RUNTIME.lock().detect()
}

fn snapshot_windows() -> Result<(WaylandProtocolMode, Vec<WaylandWindowState>)> {
    WAYLAND_RUNTIME.lock().snapshot()
}

fn focus_wayland_window(window_id: &str) -> Result<()> {
    WAYLAND_RUNTIME.lock().focus_window(window_id)
}

fn close_wayland_window(window_id: &str) -> Result<()> {
    WAYLAND_RUNTIME.lock().close_window(window_id)
}

#[derive(Default)]
pub struct GenericWaylandWindowProvider;

impl GenericWaylandWindowProvider {
    fn detect_mode(&self) -> Option<WaylandProtocolMode> {
        detect_mode().ok()
    }
}

impl WindowProvider for GenericWaylandWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::GenericWayland
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        env.session_type == "wayland" && self.detect_mode().is_some()
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        match self.detect_mode() {
            Some(WaylandProtocolMode::Wlr) => WindowBackendCapabilities {
                supports_window_listing: true,
                supports_window_focus: true,
                supports_window_close: true,
                supports_frontmost_application: true,
            },
            Some(WaylandProtocolMode::Ext) => WindowBackendCapabilities {
                supports_window_listing: true,
                supports_window_focus: false,
                supports_window_close: false,
                supports_frontmost_application: false,
            },
            None => WindowBackendCapabilities::unsupported(),
        }
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>> {
        let (_, windows) = snapshot_windows()?;
        let mut icon_resolver = IconResolver::new();
        Ok(windows
            .into_iter()
            .filter(|window| !window.title.is_empty() || !window.app_id.is_empty())
            .map(|window| {
                build_window_entry(
                    state,
                    &mut icon_resolver,
                    &window.id,
                    &window.title,
                    &window.app_id,
                    Some(window.app_id.as_str()),
                    0,
                    "",
                    window.active,
                )
            })
            .collect())
    }

    fn focus_window(&self, window_id: &str) -> Result<()> {
        focus_wayland_window(window_id)
    }

    fn close_window(&self, window_id: &str) -> Result<()> {
        close_wayland_window(window_id)
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>> {
        let (mode, windows) = snapshot_windows()?;
        if mode == WaylandProtocolMode::Ext {
            return Ok(None);
        }

        Ok(windows
            .into_iter()
            .find(|window| window.active)
            .map(|window| FocusedWindowInfo {
                id: window.id,
                title: window.title,
                app_name: super::app_name_from_entry(state, 0, &window.app_id),
                class_name: window.app_id.clone(),
                app_id: (!window.app_id.is_empty()).then_some(window.app_id),
                pid: None,
                workspace: String::new(),
                is_focused: true,
            }))
    }
}
