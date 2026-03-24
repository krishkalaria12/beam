use serde::{Deserialize, Serialize};
use serde_json::from_value;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use super::error::{CalculatorError, Result};

use crate::calculator::config::CONFIG as CALCULATOR_CONFIG;

static NEXT_HISTORY_DISCRIMINATOR: AtomicU16 = AtomicU16::new(0);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CalculatorHistoryEntry {
    pub query: String,
    pub result: String,
    pub timestamp: i64,
    pub session_id: Option<String>,
}

pub fn get_history(app: &AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    let store = app
        .store(CALCULATOR_CONFIG.store_file_name)
        .map_err(|e| CalculatorError::StoreOpeningError(e.to_string()))?;

    let json_value = store.get(CALCULATOR_CONFIG.history_key);

    if let Some(value) = json_value {
        let entries = from_value::<Vec<CalculatorHistoryEntry>>(value)
            .map_err(|e| CalculatorError::SerializationError(e.to_string()))?;
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
    let mut pinned_timestamps = get_pinned_timestamps(app)?;

    let new_entry = CalculatorHistoryEntry {
        query,
        result,
        timestamp: now_timestamp_millis(),
        session_id: Some(session_id.clone()),
    };

    let current_query = new_entry.query.clone();
    let current_result = new_entry.result.clone();
    let should_keep_pinned = history.iter().any(|entry| {
        entry.query == current_query
            && entry.result == current_result
            && pinned_timestamps
                .iter()
                .any(|timestamp| *timestamp == entry.timestamp)
    });

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

    history.truncate(CALCULATOR_CONFIG.max_history_entries);

    if should_keep_pinned {
        if let Some(entry) = history
            .iter()
            .find(|entry| entry.query == current_query && entry.result == current_result)
        {
            pinned_timestamps.push(entry.timestamp);
        }
    }

    let active_timestamps = history
        .iter()
        .map(|entry| entry.timestamp)
        .collect::<Vec<_>>();
    pinned_timestamps.retain(|timestamp| active_timestamps.contains(timestamp));
    pinned_timestamps.sort_unstable();
    pinned_timestamps.dedup();

    persist_history(app, &history)?;
    save_pinned_timestamps(app, &pinned_timestamps)
}

fn now_timestamp_millis() -> i64 {
    let base_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default();
    let discriminator =
        i64::from(NEXT_HISTORY_DISCRIMINATOR.fetch_add(1, Ordering::Relaxed) % 1000);
    base_millis
        .saturating_mul(1000)
        .saturating_add(discriminator)
}

pub fn delete_history_entry(app: &AppHandle, timestamp: i64) -> Result<()> {
    let mut history = get_history(app)?;
    history.retain(|entry| entry.timestamp != timestamp);
    persist_history(app, &history)?;

    let mut pinned_timestamps = get_pinned_timestamps(app)?;
    pinned_timestamps.retain(|entry_timestamp| *entry_timestamp != timestamp);
    save_pinned_timestamps(app, &pinned_timestamps)
}

pub fn clear_history(app: &AppHandle) -> Result<()> {
    persist_history(app, &[])?;
    save_pinned_timestamps(app, &[])
}

pub fn get_pinned_timestamps(app: &AppHandle) -> Result<Vec<i64>> {
    let store = app
        .store(CALCULATOR_CONFIG.store_file_name)
        .map_err(|e| CalculatorError::StoreOpeningError(e.to_string()))?;

    let Some(value) = store.get(CALCULATOR_CONFIG.pinned_timestamps_key) else {
        return Ok(Vec::new());
    };

    let mut timestamps = from_value::<Vec<i64>>(value)
        .map_err(|e| CalculatorError::SerializationError(e.to_string()))?;
    timestamps.sort_unstable();
    timestamps.dedup();
    Ok(timestamps)
}

pub fn set_history_entry_pinned(app: &AppHandle, timestamp: i64, pinned: bool) -> Result<Vec<i64>> {
    let mut timestamps = get_pinned_timestamps(app)?;
    if pinned {
        if !timestamps
            .iter()
            .any(|entry_timestamp| *entry_timestamp == timestamp)
        {
            timestamps.push(timestamp);
        }
    } else {
        timestamps.retain(|entry_timestamp| *entry_timestamp != timestamp);
    }

    timestamps.sort_unstable();
    timestamps.dedup();
    save_pinned_timestamps(app, &timestamps)?;
    Ok(timestamps)
}

fn persist_history(app: &AppHandle, history: &[CalculatorHistoryEntry]) -> Result<()> {
    let store = app
        .store(CALCULATOR_CONFIG.store_file_name)
        .map_err(|e| CalculatorError::StoreOpeningError(e.to_string()))?;

    let json_value = serde_json::to_value(history)
        .map_err(|e| CalculatorError::SerializationError(e.to_string()))?;

    store.set(CALCULATOR_CONFIG.history_key, json_value);
    store
        .save()
        .map_err(|e| CalculatorError::StoreSaveError(e.to_string()))?;

    Ok(())
}

fn save_pinned_timestamps(app: &AppHandle, timestamps: &[i64]) -> Result<()> {
    let store = app
        .store(CALCULATOR_CONFIG.store_file_name)
        .map_err(|e| CalculatorError::StoreOpeningError(e.to_string()))?;

    let json_value = serde_json::to_value(timestamps)
        .map_err(|e| CalculatorError::SerializationError(e.to_string()))?;

    store.set(CALCULATOR_CONFIG.pinned_timestamps_key, json_value);
    store
        .save()
        .map_err(|e| CalculatorError::StoreSaveError(e.to_string()))?;

    Ok(())
}
