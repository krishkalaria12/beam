use serde_json::from_value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use super::{
    error::{Error, Result},
    Quicklink,
};
use crate::config::config;

pub fn get_quicklinks_from_store(app: &AppHandle) -> Result<Vec<Quicklink>> {
    let store = app
        .store(&config().QUICKLINK_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let json_value = match store.get(&config().QUICKLINK_VALUE_NAME) {
        Some(value) => value,
        None => return Ok(Vec::new()),
    };

    from_value::<Vec<Quicklink>>(json_value)
        .map_err(|e| Error::SerializationError(format!("failed to parse quicklinks: {e}")))
}

pub fn save_quicklinks_to_store(app: &AppHandle, quicklink: &Quicklink) -> Result<()> {
    let mut quick_links = get_quicklinks_from_store(app)?;
    quick_links.insert(0, quicklink.clone());

    save_all_quicklinks_to_store(app, &quick_links)
}

pub fn save_all_quicklinks_to_store(app: &AppHandle, quicklinks: &[Quicklink]) -> Result<()> {
    let store = app
        .store(&config().QUICKLINK_STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

    let app_json = serde_json::to_value(quicklinks)
        .map_err(|e| Error::SerializationError(format!("failed to serialize quicklinks: {e}")))?;

    store.set(config().QUICKLINK_VALUE_NAME, app_json);
    store
        .save()
        .map_err(|e| Error::StoreSaveError(e.to_string()))?;

    Ok(())
}
