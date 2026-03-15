use std::collections::BTreeMap;

use serde_json::{Map, Value};
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::config::CONFIG as APP_CONFIG;
use crate::hotkeys::config::CONFIG as HOTKEYS_CONFIG;

use super::models::HotkeySettings;
use super::shortcuts::normalize_hotkey_text;

pub(super) fn open_store(app: &AppHandle) -> Result<std::sync::Arc<Store<Wry>>, String> {
    app.store(APP_CONFIG.store_file_name)
        .map_err(|err| format!("failed to open settings store: {err}"))
}

pub(super) fn read_hotkey_settings(store: &Store<Wry>) -> HotkeySettings {
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
    store: &Store<Wry>,
    command_hotkeys: &BTreeMap<String, String>,
) -> Result<(), String> {
    let mut payload = Map::new();
    for (command_id, hotkey) in command_hotkeys {
        payload.insert(command_id.clone(), Value::String(hotkey.clone()));
    }
    store.set(HOTKEYS_CONFIG.command_hotkeys_key, Value::Object(payload));
    store
        .save()
        .map_err(|err| format!("failed to save command hotkeys: {err}"))
}

fn read_command_hotkeys(store: &Store<Wry>) -> BTreeMap<String, String> {
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
