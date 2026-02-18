use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::config::config;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UiLayoutMode {
    Expanded,
    Compressed,
}

impl Default for UiLayoutMode {
    fn default() -> Self {
        Self::Expanded
    }
}

#[tauri::command]
pub fn get_ui_layout_mode(app: AppHandle) -> Result<UiLayoutMode, String> {
    let store = app
        .store(config().STORE_NAME)
        .map_err(|err| format!("failed to open settings store: {err}"))?;

    let value = store.get(config().UI_LAYOUT_MODE_VALUE);

    let mode = value
        .and_then(|stored| stored.as_str().map(str::to_string))
        .and_then(|stored| match stored.as_str() {
            "expanded" => Some(UiLayoutMode::Expanded),
            "compressed" => Some(UiLayoutMode::Compressed),
            _ => None,
        })
        .unwrap_or_default();

    Ok(mode)
}

#[tauri::command]
pub fn set_ui_layout_mode(app: AppHandle, mode: UiLayoutMode) -> Result<(), String> {
    let store = app
        .store(config().STORE_NAME)
        .map_err(|err| format!("failed to open settings store: {err}"))?;

    let mode_value = match mode {
        UiLayoutMode::Expanded => "expanded",
        UiLayoutMode::Compressed => "compressed",
    };

    store.set(config().UI_LAYOUT_MODE_VALUE, mode_value);
    store
        .save()
        .map_err(|err| format!("failed to save ui layout mode: {err}"))
}
