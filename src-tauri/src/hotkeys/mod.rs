mod models;
mod runtime;
mod shortcuts;
mod store;

pub use models::{
    CommandHotkeyUpdateResult, CompositorBindings, HotkeyCapabilities, HotkeySettings,
    HotkeyUpdateResult,
};
pub use runtime::{
    dispatch_hotkey_command, dispatch_hotkey_command_startup, initialize_hotkey_backend,
    toggle_launcher,
};

use serde_json::Value;
use tauri::{command, AppHandle};

use self::runtime::{
    emit_settings_updated_event, hotkey_capabilities, request_hotkey_runtime_reload,
};
use self::shortcuts::{
    build_compositor_bindings, canonical_hotkey_for_compare, normalize_hotkey_text,
};
use self::store::{open_store, read_hotkey_settings, save_command_hotkeys};
use crate::config::config;

#[command]
pub fn get_hotkey_settings(app: AppHandle) -> Result<HotkeySettings, String> {
    let store = open_store(&app)?;
    Ok(read_hotkey_settings(&store))
}

#[command]
pub fn get_hotkey_capabilities() -> HotkeyCapabilities {
    hotkey_capabilities()
}

#[command]
pub fn get_hotkey_compositor_bindings(app: AppHandle) -> Result<CompositorBindings, String> {
    let store = open_store(&app)?;
    let settings = read_hotkey_settings(&store);
    let capabilities = hotkey_capabilities();
    Ok(build_compositor_bindings(&settings, &capabilities))
}

#[command]
pub fn update_global_shortcut(
    app: AppHandle,
    shortcut: String,
) -> Result<HotkeyUpdateResult, String> {
    let normalized = normalize_hotkey_text(&shortcut);
    if normalized.is_empty() {
        return Ok(HotkeyUpdateResult {
            success: false,
            error: Some("invalid".to_string()),
        });
    }

    let store = open_store(&app)?;
    store.set(
        config().HOTKEY_GLOBAL_SHORTCUT_VALUE,
        Value::String(normalized),
    );
    store
        .save()
        .map_err(|err| format!("failed to save global hotkey: {err}"))?;

    emit_settings_updated_event(&app);
    request_hotkey_runtime_reload();

    Ok(HotkeyUpdateResult {
        success: true,
        error: None,
    })
}

#[command]
pub fn update_command_hotkey(
    app: AppHandle,
    command_id: String,
    hotkey: String,
) -> Result<CommandHotkeyUpdateResult, String> {
    let normalized_command_id = command_id.trim().to_string();
    if normalized_command_id.is_empty() {
        return Ok(CommandHotkeyUpdateResult {
            success: false,
            error: Some("invalid-command-id".to_string()),
            conflict_command_id: None,
        });
    }

    let normalized_hotkey = normalize_hotkey_text(&hotkey);
    let store = open_store(&app)?;
    let mut settings = read_hotkey_settings(&store);

    if !normalized_hotkey.is_empty() {
        let requested_canonical = canonical_hotkey_for_compare(&normalized_hotkey);
        for (other_command_id, other_hotkey) in &settings.command_hotkeys {
            if other_command_id == &normalized_command_id {
                continue;
            }
            if canonical_hotkey_for_compare(other_hotkey) == requested_canonical {
                return Ok(CommandHotkeyUpdateResult {
                    success: false,
                    error: Some("duplicate".to_string()),
                    conflict_command_id: Some(other_command_id.clone()),
                });
            }
        }
        settings
            .command_hotkeys
            .insert(normalized_command_id, normalized_hotkey);
    } else {
        settings.command_hotkeys.remove(&normalized_command_id);
    }

    save_command_hotkeys(&store, &settings.command_hotkeys)?;
    emit_settings_updated_event(&app);
    request_hotkey_runtime_reload();

    Ok(CommandHotkeyUpdateResult {
        success: true,
        error: None,
        conflict_command_id: None,
    })
}

#[command]
pub fn remove_command_hotkey(
    app: AppHandle,
    command_id: String,
) -> Result<HotkeyUpdateResult, String> {
    let normalized_command_id = command_id.trim().to_string();
    if normalized_command_id.is_empty() {
        return Ok(HotkeyUpdateResult {
            success: false,
            error: Some("invalid-command-id".to_string()),
        });
    }

    let store = open_store(&app)?;
    let mut settings = read_hotkey_settings(&store);
    settings.command_hotkeys.remove(&normalized_command_id);
    save_command_hotkeys(&store, &settings.command_hotkeys)?;
    emit_settings_updated_event(&app);
    request_hotkey_runtime_reload();

    Ok(HotkeyUpdateResult {
        success: true,
        error: None,
    })
}
