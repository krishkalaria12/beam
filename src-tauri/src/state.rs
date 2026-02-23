use keepawake::KeepAwake;
use papaya::HashMap;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

use crate::file_search::{self, types::FileEntry};

pub struct AppState {
    pub index: Arc<HashMap<String, FileEntry>>,
    pub awake_handle: Arc<Mutex<Option<KeepAwake>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            index: Arc::new(HashMap::new()),
            awake_handle: Arc::new(Mutex::new(None)),
        }
    }
}

pub fn init(app: &AppHandle) {
    let state = app.state::<AppState>();
    let index = Arc::clone(&state.index);
    tauri::async_runtime::spawn(async move {
        file_search::initialize_backend(index).await;
    });
}
