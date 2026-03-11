pub(crate) mod config;
pub mod error;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use self::config::CONFIG as SETTINGS_CONFIG;
use self::error::{Result, SettingsError};
use crate::config::CONFIG as APP_CONFIG;

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UiLayoutMode {
    #[default]
    Expanded,
    Compressed,
}

fn open_store(app: &AppHandle) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>> {
    app.store(APP_CONFIG.store_file_name)
        .map_err(|err| SettingsError::StoreOpen(err.to_string()))
}

fn parse_ui_layout_mode(value: Option<serde_json::Value>) -> UiLayoutMode {
    value
        .and_then(|stored| stored.as_str().map(str::to_string))
        .and_then(|stored| match stored.as_str() {
            "expanded" => Some(UiLayoutMode::Expanded),
            "compressed" => Some(UiLayoutMode::Compressed),
            _ => None,
        })
        .unwrap_or_default()
}

fn serialize_ui_layout_mode(mode: UiLayoutMode) -> &'static str {
    match mode {
        UiLayoutMode::Expanded => "expanded",
        UiLayoutMode::Compressed => "compressed",
    }
}

#[tauri::command]
pub fn get_ui_layout_mode(app: AppHandle) -> Result<UiLayoutMode> {
    let store = open_store(&app)?;
    Ok(parse_ui_layout_mode(
        store.get(SETTINGS_CONFIG.ui_layout_mode_key),
    ))
}

#[tauri::command]
pub fn set_ui_layout_mode(app: AppHandle, mode: UiLayoutMode) -> Result<()> {
    let store = open_store(&app)?;
    store.set(
        SETTINGS_CONFIG.ui_layout_mode_key,
        serialize_ui_layout_mode(mode),
    );
    store
        .save()
        .map_err(|err| SettingsError::StoreSave(err.to_string()))
}
