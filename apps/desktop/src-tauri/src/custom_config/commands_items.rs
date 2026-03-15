use serde_json::{Map, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{command, AppHandle};

use crate::config::CONFIG as APP_CONFIG;
use crate::custom_config::config::CONFIG as CUSTOM_CONFIG;
use crate::custom_config::error::{CustomConfigError, Result};
use crate::hotkeys;

const NON_HIDEABLE_COMMAND_IDS: [&str; 1] = ["settings.panel.open"];

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.clone()));
}

fn normalize_command_id(command_id: &str) -> Option<String> {
    let normalized = command_id.trim();
    if normalized.is_empty() {
        return None;
    }
    Some(normalized.to_string())
}

fn resolve_settings_path() -> Result<PathBuf> {
    let base_dir = dirs::config_dir().ok_or(CustomConfigError::ConfigDirUnavailable)?;
    let app_dir = base_dir.join(APP_CONFIG.service_name);
    Ok(app_dir.join(APP_CONFIG.store_file_name))
}

fn ensure_parent_dir(path: &Path) -> Result<()> {
    let Some(parent) = path.parent() else {
        return Ok(());
    };
    fs::create_dir_all(parent).map_err(|e| CustomConfigError::ConfigDirCreateError(e.to_string()))
}

fn read_settings_object(path: &Path) -> Result<Map<String, Value>> {
    if !path.exists() {
        return Ok(Map::new());
    }

    let raw = fs::read_to_string(path).map_err(|e| CustomConfigError::ReadError(e.to_string()))?;
    if raw.trim().is_empty() {
        return Ok(Map::new());
    }

    let payload: Value =
        serde_json::from_str(&raw).map_err(|e| CustomConfigError::ParseError(e.to_string()))?;
    let Value::Object(settings) = payload else {
        return Err(CustomConfigError::InvalidRootDocument);
    };
    Ok(settings)
}

fn write_settings_object(path: &Path, settings: Map<String, Value>) -> Result<()> {
    ensure_parent_dir(path)?;
    let raw = serde_json::to_string_pretty(&settings)
        .map_err(|e| CustomConfigError::SerializationError(e.to_string()))?;
    fs::write(path, raw).map_err(|e| CustomConfigError::WriteError(e.to_string()))
}

fn is_non_hideable_command_id(command_id: &str) -> bool {
    NON_HIDEABLE_COMMAND_IDS
        .iter()
        .any(|entry| *entry == command_id)
}

fn parse_hidden_command_ids(value: Option<&Value>) -> Vec<String> {
    let mut hidden = Vec::new();
    let Some(Value::Array(items)) = value else {
        return hidden;
    };

    for item in items {
        let Some(raw_id) = item.as_str() else {
            continue;
        };
        if let Some(command_id) = normalize_command_id(raw_id) {
            if is_non_hideable_command_id(&command_id) {
                continue;
            }
            hidden.push(command_id);
        }
    }

    dedupe_keep_order(&mut hidden);
    hidden
}

fn load_hidden_command_ids() -> Result<Vec<String>> {
    let path = resolve_settings_path()?;
    let settings = read_settings_object(&path)?;
    Ok(parse_hidden_command_ids(
        settings.get(CUSTOM_CONFIG.hidden_command_ids_key),
    ))
}

pub fn is_command_hidden(app: &AppHandle, command_id: &str) -> bool {
    let _ = app;
    let Some(normalized_command_id) = normalize_command_id(command_id) else {
        return false;
    };

    match load_hidden_command_ids() {
        Ok(hidden_ids) => hidden_ids
            .iter()
            .any(|entry| entry == normalized_command_id.as_str()),
        Err(error) => {
            log::warn!("failed to load hidden command settings: {error}");
            false
        }
    }
}

#[command]
pub fn get_hidden_command_ids(app: AppHandle) -> Result<Vec<String>> {
    let _ = app;
    load_hidden_command_ids()
}

#[command]
pub fn set_command_hidden(app: AppHandle, command_id: String, hidden: bool) -> Result<Vec<String>> {
    let normalized_command_id = normalize_command_id(&command_id).ok_or_else(|| {
        CustomConfigError::InvalidArguments("command_id cannot be empty".to_string())
    })?;
    if hidden && is_non_hideable_command_id(&normalized_command_id) {
        return Err(CustomConfigError::InvalidArguments(format!(
            "command '{normalized_command_id}' cannot be hidden"
        )));
    }

    let path = resolve_settings_path()?;
    let mut settings = read_settings_object(&path)?;
    let mut commands = parse_hidden_command_ids(settings.get(CUSTOM_CONFIG.hidden_command_ids_key));
    if hidden {
        commands.push(normalized_command_id.clone());
    } else {
        commands.retain(|entry| entry != normalized_command_id.as_str());
    }
    dedupe_keep_order(&mut commands);

    settings.insert(
        CUSTOM_CONFIG.hidden_command_ids_key.to_string(),
        Value::Array(commands.iter().cloned().map(Value::String).collect()),
    );
    write_settings_object(&path, settings)?;

    if hidden {
        if let Err(error) = hotkeys::remove_command_hotkey(app, normalized_command_id) {
            log::warn!("failed to remove hidden command hotkey: {error}");
        }
    }

    Ok(commands)
}
