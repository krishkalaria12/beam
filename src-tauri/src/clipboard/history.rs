use serde_json::from_value;
use std::collections::HashSet;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::{
    clipboard::error::{Error, Result},
    config::config,
};

pub fn get_from_history(store: &Store<Wry>) -> Option<Vec<String>> {
    let json_value = store.get(&config().CLIPBOARD_HISTORY_VALUE)?;
    from_value::<Vec<String>>(json_value).ok()
}

pub fn get_history(app: &AppHandle) -> Result<Vec<String>> {
    let store = app
        .store(&config().CLIPBOARD_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let mut history = get_from_history(&store).unwrap_or_default();
    dedupe_keep_order(&mut history);
    history.truncate(config().CLIPBOARD_MAX_HISTORY_ENTRIES);

    Ok(history)
}

pub fn save_to_history(app: &AppHandle, copy_value: String) -> Result<()> {
    let store = app
        .store(&config().CLIPBOARD_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let mut history = get_from_history(&store).unwrap_or_default();
    history.retain(|entry| entry != &copy_value);
    history.insert(0, copy_value);
    dedupe_keep_order(&mut history);
    history.truncate(config().CLIPBOARD_MAX_HISTORY_ENTRIES);

    let app_json =
        serde_json::to_value(history).map_err(|e| Error::SerializationError(e.to_string()))?;

    store.set(config().CLIPBOARD_HISTORY_VALUE, app_json);
    store
        .save()
        .map_err(|e| Error::StoreSaveError(e.to_string()))?;

    Ok(())
}

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|value| seen.insert(value.clone()));
}
