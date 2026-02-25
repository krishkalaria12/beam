use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use super::error::{ExtensionsError, Result};
use crate::config::config;

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    enabled: bool,
    model_associations: HashMap<String, String>,
}

#[derive(Deserialize)]
pub struct AskOptions {
    pub model: Option<String>,
    pub creativity: Option<String>,
    pub model_mappings: Option<HashMap<String, String>>,
}

fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| ExtensionsError::AppDataDirUnavailable)?;

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
    }

    Ok(data_dir.join(config().EXTENSIONS_AI_SETTINGS_FILE))
}

fn read_settings(path: &Path) -> Result<AiSettings> {
    if !path.exists() {
        return Ok(AiSettings::default());
    }

    let content = fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(AiSettings::default());
    }

    serde_json::from_str(&content).map_err(ExtensionsError::from)
}

fn write_settings(path: &Path, settings: &AiSettings) -> Result<()> {
    let content = serde_json::to_string_pretty(settings)?;
    fs::write(path, content)?;
    Ok(())
}

fn get_keyring_entry() -> Result<keyring::Entry> {
    keyring::Entry::new(
        config().EXTENSIONS_AI_KEYRING_SERVICE,
        config().EXTENSIONS_AI_KEYRING_USERNAME,
    )
    .map_err(ExtensionsError::from)
}

#[tauri::command]
pub fn get_ai_settings(app: tauri::AppHandle) -> Result<AiSettings> {
    let path = get_settings_path(&app)?;
    read_settings(&path)
}

#[tauri::command]
pub fn set_ai_settings(app: tauri::AppHandle, settings: AiSettings) -> Result<()> {
    let path = get_settings_path(&app)?;
    write_settings(&path, &settings)
}

#[tauri::command]
pub fn set_ai_api_key(key: String) -> Result<()> {
    let entry = get_keyring_entry()?;
    entry.set_password(&key).map_err(ExtensionsError::from)
}

#[tauri::command]
pub fn is_ai_api_key_set() -> Result<bool> {
    let entry = get_keyring_entry()?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(ExtensionsError::from(error)),
    }
}

#[tauri::command]
pub fn clear_ai_api_key() -> Result<()> {
    let entry = get_keyring_entry()?;
    entry.delete_credential().map_err(ExtensionsError::from)
}

#[tauri::command]
pub fn ai_can_access(app: tauri::AppHandle) -> Result<bool> {
    let settings = get_ai_settings(app)?;
    if !settings.enabled {
        return Ok(false);
    }
    is_ai_api_key_set()
}

#[tauri::command]
pub async fn ai_ask_stream(
    app_handle: AppHandle,
    request_id: String,
    _prompt: String,
    options: AskOptions,
) -> Result<()> {
    if !ai_can_access(app_handle.clone())? {
        return Err(ExtensionsError::AiAccessDisabled);
    }

    // Placeholder behavior for now: emit a terminal stream error so extensions can fail gracefully.
    let model_name = options.model.unwrap_or_else(|| "default".to_string());
    let creativity = options.creativity.unwrap_or_else(|| "balanced".to_string());
    let mapping_count = options.model_mappings.as_ref().map_or(0, HashMap::len);
    let message = format!(
        "AI streaming is not configured in Beam yet (model: {}, creativity: {}, mappings: {}).",
        model_name, creativity, mapping_count
    );

    app_handle
        .emit(
            "ai-stream-error",
            serde_json::json!({
                "requestId": request_id,
                "error": message,
            }),
        )
        .map_err(|error| ExtensionsError::Message(error.to_string()))?;

    Ok(())
}
