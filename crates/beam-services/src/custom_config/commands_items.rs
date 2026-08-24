use serde_json::{Map, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

// PORT: apps/desktop/src-tauri/src/custom_config/commands_items.rs
// AppHandle became &BeamContext; the settings file lives in the config dir
// (BeamPaths::config_store_path), exactly where dirs::config_dir() put it.
// The hidden-command hotkey teardown below waits for the hotkeys module
// (lane A5) — tracked with a PORT TODO at the call site.

use beam_core::BeamContext;

use crate::config::CONFIG as APP_CONFIG;
use crate::custom_config::config::CONFIG as CUSTOM_CONFIG;
use crate::custom_config::error::{CustomConfigError, Result};

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

fn resolve_settings_path(cx: &BeamContext) -> Result<PathBuf> {
    Ok(cx.paths().config_store_path(APP_CONFIG.store_file_name))
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

fn load_hidden_command_ids(cx: &BeamContext) -> Result<Vec<String>> {
    let path = resolve_settings_path(cx)?;
    let settings = read_settings_object(&path)?;
    Ok(parse_hidden_command_ids(
        settings.get(CUSTOM_CONFIG.hidden_command_ids_key),
    ))
}

pub fn is_command_hidden(cx: &BeamContext, command_id: &str) -> bool {
    let Some(normalized_command_id) = normalize_command_id(command_id) else {
        return false;
    };

    match load_hidden_command_ids(cx) {
        Ok(hidden_ids) => hidden_ids
            .iter()
            .any(|entry| entry == normalized_command_id.as_str()),
        Err(error) => {
            log::warn!("failed to load hidden command settings: {error}");
            false
        }
    }
}

pub fn get_hidden_command_ids(cx: &BeamContext) -> Result<Vec<String>> {
    load_hidden_command_ids(cx)
}

pub fn set_command_hidden(
    cx: &BeamContext,
    command_id: String,
    hidden: bool,
) -> Result<Vec<String>> {
    let normalized_command_id = normalize_command_id(&command_id).ok_or_else(|| {
        CustomConfigError::InvalidArguments("command_id cannot be empty".to_string())
    })?;
    if hidden && is_non_hideable_command_id(&normalized_command_id) {
        return Err(CustomConfigError::InvalidArguments(format!(
            "command '{normalized_command_id}' cannot be hidden"
        )));
    }

    let path = resolve_settings_path(cx)?;
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
        // TODO(PORT: apps/desktop/src-tauri/src/hotkeys): remove the hidden
        // command's hotkey here once the hotkeys module lands (lane A5).
        log::debug!("command '{normalized_command_id}' hidden; hotkey teardown pending lane A5");
    }

    Ok(commands)
}

#[cfg(test)]
mod tests {
    use super::*;
    use beam_core::{BeamPaths, HostPlatform};

    fn test_context(name: &str) -> BeamContext {
        let dir = std::env::temp_dir().join(format!("beam-custom-config-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        let paths = BeamPaths::from_platform(
            HostPlatform::Linux,
            Some(dir.into_os_string()),
            None,
            None,
            None,
            None,
        )
        .unwrap();
        BeamContext::with_paths(paths).unwrap()
    }

    #[test]
    fn hidden_commands_round_trip() {
        let cx = test_context("roundtrip");
        assert!(get_hidden_command_ids(&cx).unwrap().is_empty());
        assert!(!is_command_hidden(&cx, "ai.panel.open"));

        set_command_hidden(&cx, "ai.panel.open".into(), true).unwrap();
        assert!(is_command_hidden(&cx, "ai.panel.open"));

        set_command_hidden(&cx, "ai.panel.open".into(), false).unwrap();
        assert!(!is_command_hidden(&cx, "ai.panel.open"));
    }

    #[test]
    fn the_settings_panel_cannot_be_hidden() {
        let cx = test_context("non-hideable");
        assert!(set_command_hidden(&cx, "settings.panel.open".into(), true).is_err());
        // Unhiding a non-hideable entry is harmless.
        set_command_hidden(&cx, "settings.panel.open".into(), false).unwrap();
    }

    #[test]
    fn empty_command_ids_are_rejected() {
        let cx = test_context("empty");
        assert!(set_command_hidden(&cx, "  ".into(), true).is_err());
    }
}
