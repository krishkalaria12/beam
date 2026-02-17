use papaya::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use crate::file_search::{self, types::FileEntry};

pub struct AppState {
    pub index: Arc<HashMap<String, FileEntry>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            index: Arc::new(HashMap::new()),
        }
    }
}

pub fn init(app: &AppHandle) {
    let state = app.state::<AppState>();
    let index = state.index.clone();
    tauri::async_runtime::spawn(async move {
        file_search::initialize_backend(index).await;
    });
}
