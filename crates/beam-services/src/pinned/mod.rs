pub(crate) mod config;
pub mod error;

// PORT: apps/desktop/src-tauri/src/pinned/mod.rs
// The tauri_plugin_store handle became the shared settings store on
// BeamContext — same settings.json, same keys.

use std::collections::HashSet;

use beam_core::{BeamContext, JsonStore};
use serde::{Deserialize, Serialize};
use serde_json::{from_value, to_value};

use crate::pinned::config::CONFIG as PINNED_CONFIG;

use self::error::{PinnedError, Result};

#[derive(Debug, Clone, Deserialize, Serialize)]
struct StoredPinnedCommand {
    command_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum StoredPinnedEntry {
    CommandId(String),
    LegacyCommand(StoredPinnedCommand),
}

pub fn get_pinned_command_ids(cx: &BeamContext) -> Result<Vec<String>> {
    read_pinned_command_ids(cx.settings())
}

pub fn set_command_pinned(
    cx: &BeamContext,
    pinned: bool,
    command_id: String,
) -> Result<Vec<String>> {
    let normalized_id = normalize_command_id(&command_id)
        .ok_or_else(|| PinnedError::InvalidArguments("command id cannot be empty".to_string()))?;

    let store = cx.settings();
    let mut pinned_ids = read_pinned_command_ids(store)?;
    let previous_pinned_ids = pinned_ids.clone();

    if pinned {
        if !pinned_ids.iter().any(|item| item == &normalized_id) {
            pinned_ids.push(normalized_id);
        }
    } else {
        pinned_ids.retain(|item| item != &normalized_id);
    }

    if pinned_ids != previous_pinned_ids {
        save_to_store(&store, &pinned_ids)?;
    }

    Ok(pinned_ids)
}

fn read_pinned_command_ids(store: &JsonStore) -> Result<Vec<String>> {
    let Some(value) = store.get(PINNED_CONFIG.command_ids_key) else {
        return Ok(Vec::new());
    };

    let entries = from_value::<Vec<StoredPinnedEntry>>(value)
        .map_err(|e| PinnedError::DeserializationError(e.to_string()))?;

    let mut ids = Vec::with_capacity(entries.len());
    for entry in entries {
        let raw_id = match entry {
            StoredPinnedEntry::CommandId(command_id) => command_id,
            StoredPinnedEntry::LegacyCommand(legacy) => legacy.command_id,
        };

        if let Some(normalized) = normalize_command_id(&raw_id) {
            ids.push(normalized);
        }
    }

    dedupe_keep_order(&mut ids);
    Ok(ids)
}

fn normalize_command_id(command_id: &str) -> Option<String> {
    let normalized = command_id.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
}

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.clone()));
}

fn save_to_store(store: &JsonStore, pinned_ids: &[String]) -> Result<()> {
    let app_json =
        to_value(pinned_ids).map_err(|e| PinnedError::SerializationError(e.to_string()))?;
    store
        .set(PINNED_CONFIG.command_ids_key, &app_json)
        .map_err(|e| PinnedError::StoreSaveError(e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use beam_core::{BeamPaths, HostPlatform};

    fn test_context(name: &str) -> BeamContext {
        let dir = std::env::temp_dir().join(format!("beam-pinned-{name}"));
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
    fn pinned_ids_round_trip_and_dedupe() {
        let cx = test_context("roundtrip");
        assert!(get_pinned_command_ids(&cx).unwrap().is_empty());

        set_command_pinned(&cx, true, "settings.panel.open".into()).unwrap();
        set_command_pinned(&cx, true, " focus.panel.open ".into()).unwrap();
        // Re-pinning is idempotent.
        set_command_pinned(&cx, true, "settings.panel.open".into()).unwrap();

        let pinned = get_pinned_command_ids(&cx).unwrap();
        assert_eq!(
            pinned,
            vec![
                "settings.panel.open".to_string(),
                "focus.panel.open".to_string()
            ]
        );

        set_command_pinned(&cx, false, "settings.panel.open".into()).unwrap();
        let pinned = get_pinned_command_ids(&cx).unwrap();
        assert_eq!(pinned, vec!["focus.panel.open".to_string()]);
    }

    #[test]
    fn empty_command_ids_are_rejected() {
        let cx = test_context("empty");
        assert!(set_command_pinned(&cx, true, "   ".into()).is_err());
    }

    #[test]
    fn legacy_object_entries_still_read() {
        // The old build once stored [{"command_id": "..."}] objects (the
        // struct had no rename); the untagged reader must keep accepting
        // them alongside plain strings.
        let cx = test_context("legacy");
        cx.settings()
            .set(
                PINNED_CONFIG.command_ids_key,
                &serde_json::json!([
                    {"command_id": "legacy.entry"},
                    "modern.entry"
                ]),
            )
            .unwrap();
        let pinned = get_pinned_command_ids(&cx).unwrap();
        assert_eq!(
            pinned,
            vec!["legacy.entry".to_string(), "modern.entry".to_string()]
        );
    }
}
