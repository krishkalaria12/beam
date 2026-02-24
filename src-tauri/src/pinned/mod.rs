use std::collections::HashSet;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::{from_value, to_value};
use tauri::{command, AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::config::config;

use self::error::{Error, Result};

pub mod error;

#[derive(Debug, Clone, Deserialize, Serialize)]
struct StoredPinnedCommand {
    command_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum StoredPinnedEntry {
    CommandId(String),
    LegacyCommand(StoredPinnedCommand),
}

#[command]
pub fn get_pinned_command_ids(app: AppHandle) -> Result<Vec<String>> {
    let store = open_store(&app)?;
    read_pinned_command_ids(&store)
}

#[command]
pub fn set_command_pinned(app: AppHandle, pinned: bool, command_id: String) -> Result<Vec<String>> {
    let normalized_id = normalize_command_id(&command_id).ok_or_else(|| {
        Error::InvalidArguments("command id cannot be empty".to_string())
    })?;

    let store = open_store(&app)?;
    let mut pinned_ids = read_pinned_command_ids(&store)?;
    let previous_pinned_ids = pinned_ids.clone();

    if pinned {
        if !pinned_ids.iter().any(|item| item == &normalized_id) {
            pinned_ids.push(normalized_id);
        }
    } else {
        pinned_ids.retain(|item| item != &normalized_id);
    }

    if pinned_ids != previous_pinned_ids {
        save_to_store(&store, &pinned_ids)?;
    }

    Ok(pinned_ids)
}

fn open_store(app: &AppHandle) -> Result<Arc<Store<Wry>>> {
    app.store(&config().STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))
}

fn read_pinned_command_ids(store: &Store<Wry>) -> Result<Vec<String>> {
    let Some(value) = store.get(config().COMMAND_PINNED_KEY) else {
        return Ok(Vec::new());
    };

    let entries = from_value::<Vec<StoredPinnedEntry>>(value)
        .map_err(|e| Error::DeserializationError(e.to_string()))?;

    let mut ids = Vec::with_capacity(entries.len());
    for entry in entries {
        let raw_id = match entry {
            StoredPinnedEntry::CommandId(command_id) => command_id,
            StoredPinnedEntry::LegacyCommand(legacy) => legacy.command_id,
        };

        if let Some(normalized) = normalize_command_id(&raw_id) {
            ids.push(normalized);
        }
    }

    dedupe_keep_order(&mut ids);
    Ok(ids)
}

fn normalize_command_id(command_id: &str) -> Option<String> {
    let normalized = command_id.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
}

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.clone()));
}

fn save_to_store(store: &Store<Wry>, pinned_ids: &[String]) -> Result<()> {
    let app_json = to_value(pinned_ids).map_err(|e| Error::SerializationError(e.to_string()))?;
    store.set(config().COMMAND_PINNED_KEY, app_json);
    store
        .save()
        .map_err(|e| Error::StoreSaveError(e.to_string()))?;

    Ok(())
}
