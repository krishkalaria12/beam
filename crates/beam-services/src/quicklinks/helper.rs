// PORT: apps/desktop/src-tauri/src/quicklinks/helper.rs
// The tauri_plugin_store file became a plain JsonStore under the data dir —
// same file name, same key.

use serde_json::from_value;

use super::{
    error::{QuicklinkError, Result},
    Quicklink,
};
use crate::quicklinks::config::CONFIG as QUICKLINKS_CONFIG;
use beam_core::{BeamContext, JsonStore};

fn open_store(cx: &BeamContext) -> Result<JsonStore> {
    JsonStore::open(cx.paths().store_path(QUICKLINKS_CONFIG.store_file_name))
        .map_err(|e| QuicklinkError::StoreOpeningError(e.to_string()))
}

pub fn get_quicklinks_from_store(cx: &BeamContext) -> Result<Vec<Quicklink>> {
    let store = open_store(cx)?;

    let json_value = match store.get(&QUICKLINKS_CONFIG.value_key) {
        Some(value) => value,
        None => return Ok(Vec::new()),
    };

    from_value::<Vec<Quicklink>>(json_value)
        .map_err(|e| QuicklinkError::SerializationError(format!("failed to parse quicklinks: {e}")))
}

pub fn save_quicklinks_to_store(cx: &BeamContext, quicklink: &Quicklink) -> Result<()> {
    let mut quick_links = get_quicklinks_from_store(cx)?;
    quick_links.insert(0, quicklink.clone());

    save_all_quicklinks_to_store(cx, &quick_links)
}

pub fn save_all_quicklinks_to_store(cx: &BeamContext, quicklinks: &[Quicklink]) -> Result<()> {
    let store = open_store(cx)?;

    let app_json = serde_json::to_value(quicklinks).map_err(|e| {
        QuicklinkError::SerializationError(format!("failed to serialize quicklinks: {e}"))
    })?;

    store
        .set(QUICKLINKS_CONFIG.value_key, &app_json)
        .map_err(|e| QuicklinkError::StoreSaveError(e.to_string()))?;

    Ok(())
}
