use jiff::Timestamp;
use serde::{Deserialize, Serialize};
use serde_json::from_value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::{
    calculator::error::{Error, Result},
    config::config,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CalculatorHistoryEntry {
    pub query: String,
    pub result: String,
    pub timestamp: i64,
    pub session_id: Option<String>,
}

pub fn get_history(app: &AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    let store = app
        .store(config().CALCULATOR_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let json_value = store.get(config().CALCULATOR_HISTORY_VALUE);

    if let Some(value) = json_value {
        let entries = from_value::<Vec<CalculatorHistoryEntry>>(value)
            .map_err(|e| Error::SerializationError(e.to_string()))?;
        Ok(entries)
    } else {
        Ok(Vec::new())
    }
}

pub fn save_to_history(
    app: &AppHandle,
    query: String,
    result: String,
    session_id: String,
) -> Result<()> {
    let mut history = get_history(app)?;

    let new_entry = CalculatorHistoryEntry {
        query,
        result,
        timestamp: Timestamp::now().as_second(),
        session_id: Some(session_id.clone()),
    };

    let current_query = new_entry.query.clone();
    let current_result = new_entry.result.clone();

    let mut updated = false;

    // Check if the latest entry belongs to the same session
    if let Some(first) = history.first_mut() {
        if let Some(first_session_id) = &first.session_id {
            if first_session_id == &session_id {
                *first = new_entry.clone();
                updated = true;
            }
        }
    }

    if !updated {
        history.insert(0, new_entry);
    }

    // Remove duplicates (same query and result) if any exist further down the list

    // Keep the first occurrence (which is our new/updated entry) and remove subsequent duplicates
    let mut seen = false;
    history.retain(|entry| {
        if entry.query == current_query && entry.result == current_result {
            if !seen {
                seen = true;
                true
            } else {
                false
            }
        } else {
            true
        }
    });

    history.truncate(config().CALCULATOR_MAX_HISTORY_ENTRIES);

    let store = app
        .store(config().CALCULATOR_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let json_value =
        serde_json::to_value(&history).map_err(|e| Error::SerializationError(e.to_string()))?;

    store.set(config().CALCULATOR_HISTORY_VALUE, json_value);
    store
        .save()
        .map_err(|e| Error::StoreSaveError(e.to_string()))?;

    Ok(())
}
