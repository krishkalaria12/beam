use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

use super::error::{ExtensionError, Result};
use crate::config::config;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct StoredTokenSet {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<u64>,
    scope: Option<String>,
    id_token: Option<String>,
    updated_at: String,
}

type TokenStore = HashMap<String, StoredTokenSet>;

fn get_storage_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| ExtensionError::AppDataDirUnavailable)?;

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
    }

    Ok(data_dir.join(config().EXTENSIONS_OAUTH_TOKENS_FILE))
}

fn read_store(path: &Path) -> Result<TokenStore> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(HashMap::new());
    }

    serde_json::from_str(&content).map_err(ExtensionError::from)
}

fn write_store(path: &Path, store: &TokenStore) -> Result<()> {
    let content = serde_json::to_string_pretty(store)?;
    fs::write(path, content)?;
    Ok(())
}

#[tauri::command]
pub fn oauth_set_tokens(
    app: tauri::AppHandle,
    provider_id: String,
    tokens: serde_json::Value,
) -> Result<()> {
    let path = get_storage_path(&app)?;
    let mut store = read_store(&path)?;

    let token_set: StoredTokenSet = serde_json::from_value(tokens)?;
    store.insert(provider_id, token_set);

    write_store(&path, &store)
}

#[tauri::command]
pub fn oauth_get_tokens(app: tauri::AppHandle, provider_id: String) -> Result<Option<serde_json::Value>> {
    let path = get_storage_path(&app)?;
    let store = read_store(&path)?;

    if let Some(token_set) = store.get(&provider_id) {
        let value = serde_json::to_value(token_set)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn oauth_remove_tokens(app: tauri::AppHandle, provider_id: String) -> Result<()> {
    let path = get_storage_path(&app)?;
    let mut store = read_store(&path)?;
    store.remove(&provider_id);
    write_store(&path, &store)
}
