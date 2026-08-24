// PORT: apps/desktop/src-tauri/src/hotkeys/store.rs
// The tauri_plugin_store handle became the shared settings store on
// BeamContext — same settings.json, same keys.

use std::collections::BTreeMap;

use beam_core::{BeamContext, JsonStore};
use serde_json::{Map, Value};

use crate::config::CONFIG as APP_CONFIG;
use crate::hotkeys::config::CONFIG as HOTKEYS_CONFIG;

use super::models::HotkeySettings;
use super::shortcuts::normalize_hotkey_text;

pub(super) fn open_store(cx: &BeamContext) -> Result<JsonStore, String> {
    JsonStore::open(cx.paths().store_path(APP_CONFIG.store_file_name))
        .map_err(|err| format!("failed to open settings store: {err}"))
}

pub(super) fn read_hotkey_settings(store: &JsonStore) -> HotkeySettings {
    let global_shortcut = store
        .get(HOTKEYS_CONFIG.global_shortcut_key)
        .and_then(|value| value.as_str().map(str::to_string))
        .map(|value| normalize_hotkey_text(&value))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| HOTKEYS_CONFIG.default_global_shortcut.to_string());

    let command_hotkeys = read_command_hotkeys(store);

    HotkeySettings {
        global_shortcut,
        command_hotkeys,
    }
}

pub(super) fn save_command_hotkeys(
    store: &JsonStore,
    command_hotkeys: &BTreeMap<String, String>,
) -> Result<(), String> {
    let mut payload = Map::new();
    for (command_id, hotkey) in command_hotkeys {
        payload.insert(command_id.clone(), Value::String(hotkey.clone()));
    }
    store
        .set(HOTKEYS_CONFIG.command_hotkeys_key, &Value::Object(payload))
        .map_err(|err| format!("failed to save command hotkeys: {err}"))
}

fn read_command_hotkeys(store: &JsonStore) -> BTreeMap<String, String> {
    let mut hotkeys = BTreeMap::new();
    let Some(value) = store.get(HOTKEYS_CONFIG.command_hotkeys_key) else {
        return hotkeys;
    };
    let Some(object) = value.as_object() else {
        return hotkeys;
    };

    for (command_id, hotkey_value) in object {
        let normalized_command_id = command_id.trim();
        if normalized_command_id.is_empty() {
            continue;
        }
        let Some(raw_hotkey) = hotkey_value.as_str() else {
            continue;
        };
        let normalized_hotkey = normalize_hotkey_text(raw_hotkey);
        if normalized_hotkey.is_empty() {
            continue;
        }
        hotkeys.insert(normalized_command_id.to_string(), normalized_hotkey);
    }

    hotkeys
}
