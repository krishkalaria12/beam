pub(crate) mod config;
pub mod error;

use keepawake::KeepAwake;
use papaya::HashMap;
use parking_lot::Mutex;
use std::collections::HashMap as StdHashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use sysinfo::{Pid, PidExt, ProcessExt, System, SystemExt};
use tauri::{AppHandle, Manager};

use self::config::CONFIG as STATE_CONFIG;
use self::error::{Result, StateError};
use crate::cli::bridge::CliBridgeRuntime;
use crate::file_search::{self, types::FileEntry};
use crate::snippets::model::SnippetsState;

pub struct ProcessStateCache {
    sys: System,
    pid_names: StdHashMap<u32, String>,
    last_refresh: Option<Instant>,
}

impl Default for ProcessStateCache {
    fn default() -> Self {
        Self {
            sys: System::new_all(),
            pid_names: StdHashMap::new(),
            last_refresh: None,
        }
    }
}

impl ProcessStateCache {
    pub fn new() -> Self {
        Self::default()
    }

    fn refresh_if_stale(&mut self) {
        let refresh_interval = Duration::from_millis(STATE_CONFIG.process_cache_refresh_ms);
        let should_refresh = self
            .last_refresh
            .map(|last| last.elapsed() >= refresh_interval)
            .unwrap_or(true);
        if !should_refresh {
            return;
        }

        self.sys.refresh_processes();
        self.pid_names.clear();
        for (pid, process) in self.sys.processes() {
            let pid_u32 = pid.as_u32();
            let name = process.name().trim();
            if !name.is_empty() {
                self.pid_names.insert(pid_u32, name.to_string());
            }
        }
        self.last_refresh = Some(Instant::now());
    }

    pub fn get_process_name(&mut self, pid: u32) -> Option<String> {
        self.refresh_if_stale();

        if let Some(name) = self.pid_names.get(&pid) {
            return Some(name.clone());
        }

        if let Some(process) = self.sys.process(Pid::from(pid as usize)) {
            let name = process.name().trim();
            if !name.is_empty() {
                let owned = name.to_string();
                self.pid_names.insert(pid, owned.clone());
                return Some(owned);
            }
        }

        None
    }
}

pub struct AppState {
    pub index: Arc<HashMap<String, FileEntry>>,
    pub awake_handle: Arc<Mutex<Option<KeepAwake>>>,
    pub process_cache: Arc<Mutex<ProcessStateCache>>,
    pub cli_bridge: Arc<CliBridgeRuntime>,
    pub snippets: Arc<SnippetsState>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            index: Arc::new(HashMap::new()),
            awake_handle: Arc::new(Mutex::new(None)),
            process_cache: Arc::new(Mutex::new(ProcessStateCache::default())),
            cli_bridge: Arc::new(CliBridgeRuntime::new()),
            snippets: Arc::new(SnippetsState::new()),
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
}

pub fn init(app: &AppHandle) -> Result<()> {
    let state = app
        .try_state::<AppState>()
        .ok_or(StateError::AppStateUnavailable)?;
    let index = Arc::clone(&state.index);

    tauri::async_runtime::spawn(async move {
        file_search::initialize_backend(index).await;
    });

    Ok(())
}
