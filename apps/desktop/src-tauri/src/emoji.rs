use std::collections::HashSet;
use std::sync::Arc;

use serde_json::from_value;
use tauri::{command, AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::config::CONFIG as APP_CONFIG;

const PINNED_EMOJI_HEXCODES_KEY: &str = "emoji_pinned_hexcodes";

#[command]
pub fn get_pinned_emoji_hexcodes(app: AppHandle) -> Result<Vec<String>, String> {
    let store = open_store(&app)?;
    read_pinned_emoji_hexcodes(&store)
}

#[command]
pub fn set_emoji_pinned(
    app: AppHandle,
    hexcode: String,
    pinned: bool,
) -> Result<Vec<String>, String> {
    let normalized =
        normalize_hexcode(&hexcode).ok_or_else(|| "hexcode cannot be empty".to_string())?;
    let store = open_store(&app)?;
    let mut hexcodes = read_pinned_emoji_hexcodes(&store)?;

    if pinned {
        if !hexcodes.iter().any(|existing| existing == &normalized) {
            hexcodes.push(normalized);
        }
    } else {
        hexcodes.retain(|existing| existing != &normalized);
    }

    dedupe_keep_order(&mut hexcodes);
    save_pinned_emoji_hexcodes(&store, &hexcodes)?;
    Ok(hexcodes)
}

fn open_store(app: &AppHandle) -> Result<Arc<Store<Wry>>, String> {
    app.store(APP_CONFIG.store_file_name)
        .map_err(|error| error.to_string())
}

fn read_pinned_emoji_hexcodes(store: &Store<Wry>) -> Result<Vec<String>, String> {
    let Some(value) = store.get(PINNED_EMOJI_HEXCODES_KEY) else {
        return Ok(Vec::new());
    };

    let mut hexcodes = from_value::<Vec<String>>(value).map_err(|error| error.to_string())?;
    hexcodes = hexcodes
        .into_iter()
        .filter_map(|hexcode| normalize_hexcode(&hexcode))
        .collect();
    dedupe_keep_order(&mut hexcodes);
    Ok(hexcodes)
}

fn save_pinned_emoji_hexcodes(store: &Store<Wry>, hexcodes: &[String]) -> Result<(), String> {
    let value = serde_json::to_value(hexcodes).map_err(|error| error.to_string())?;
    store.set(PINNED_EMOJI_HEXCODES_KEY, value);
    store.save().map_err(|error| error.to_string())
}

fn normalize_hexcode(hexcode: &str) -> Option<String> {
    let normalized = hexcode.trim().to_uppercase();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized)
}

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|value| seen.insert(value.clone()));
}
