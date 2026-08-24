use beam_core::BeamContext;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use super::error::{ExtensionsError, Result};
use crate::extensions::config::CONFIG as EXTENSIONS_CONFIG;

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

fn get_storage_path(cx: &BeamContext) -> Result<PathBuf> {
    let data_dir = cx.paths().local_data_dir().clone();

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
    }

    Ok(data_dir.join(EXTENSIONS_CONFIG.oauth_tokens_file_name))
}

fn read_store(path: &Path) -> Result<TokenStore> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(HashMap::new());
    }

    serde_json::from_str(&content).map_err(ExtensionsError::from)
}

fn write_store(path: &Path, store: &TokenStore) -> Result<()> {
    let content = serde_json::to_string_pretty(store)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn oauth_set_tokens(
    cx: &BeamContext,
    provider_id: String,
    tokens: serde_json::Value,
) -> Result<()> {
    let path = get_storage_path(cx)?;
    let mut store = read_store(&path)?;

    let token_set: StoredTokenSet = serde_json::from_value(tokens)?;
    store.insert(provider_id, token_set);

    write_store(&path, &store)
}

pub fn oauth_get_tokens(
    cx: &BeamContext,
    provider_id: String,
) -> Result<Option<serde_json::Value>> {
    let path = get_storage_path(cx)?;
    let store = read_store(&path)?;

    if let Some(token_set) = store.get(&provider_id) {
        let value = serde_json::to_value(token_set)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

pub fn oauth_remove_tokens(cx: &BeamContext, provider_id: String) -> Result<()> {
    let path = get_storage_path(cx)?;
    let mut store = read_store(&path)?;
    store.remove(&provider_id);
    write_store(&path, &store)
}
