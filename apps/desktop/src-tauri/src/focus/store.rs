use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use super::error::{FocusError, Result};
use super::types::{default_focus_draft, FocusCategory, FocusSession, FocusSessionDraft};
use crate::config::CONFIG as APP_CONFIG;

const FOCUS_STATE_KEY: &str = "focus.state";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedFocusState {
    pub categories: Vec<FocusCategory>,
    pub last_draft: FocusSessionDraft,
    pub session: Option<FocusSession>,
}

impl Default for PersistedFocusState {
    fn default() -> Self {
        Self {
            categories: Vec::new(),
            last_draft: default_focus_draft(),
            session: None,
        }
    }
}

fn open_store(app: &AppHandle) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>> {
    app.store(APP_CONFIG.store_file_name)
        .map_err(|err| FocusError::StoreOpen(err.to_string()))
}

pub fn load_focus_state(app: &AppHandle) -> Result<PersistedFocusState> {
    let store = open_store(app)?;
    let Some(value) = store.get(FOCUS_STATE_KEY) else {
        return Ok(PersistedFocusState::default());
    };

    match serde_json::from_value::<PersistedFocusState>(value) {
        Ok(state) => Ok(PersistedFocusState {
            categories: state.categories,
            last_draft: state.last_draft,
            session: state.session,
        }),
        Err(error) => {
            log::warn!("failed to parse focus state, resetting to defaults: {error}");
            Ok(PersistedFocusState::default())
        }
    }
}

pub fn save_focus_state(app: &AppHandle, state: &PersistedFocusState) -> Result<()> {
    let store = open_store(app)?;
    let value = serde_json::to_value(state).unwrap_or(Value::Null);
    store.set(FOCUS_STATE_KEY, value);
    store
        .save()
        .map_err(|err| FocusError::StoreSave(err.to_string()))
}
