pub(crate) mod config;
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

// PORT: apps/desktop/src-tauri/src/hotkeys/mod.rs
// Command attributes deleted; AppHandle became &BeamContext.

use beam_core::BeamContext;
use serde_json::Value;

use self::runtime::{
    emit_settings_updated_event, hotkey_capabilities, request_hotkey_runtime_reload,
};
use self::shortcuts::{
    build_compositor_bindings, canonical_hotkey_for_compare, normalize_hotkey_text,
};
use self::store::{open_store, read_hotkey_settings, save_command_hotkeys};
use crate::custom_config;
use crate::hotkeys::config::CONFIG as HOTKEYS_CONFIG;

pub fn get_hotkey_settings(cx: &BeamContext) -> Result<HotkeySettings, String> {
    let store = open_store(cx)?;
    let mut settings = read_hotkey_settings(&store);
    settings
        .command_hotkeys
        .retain(|command_id, _| !custom_config::is_command_hidden(cx, command_id));
    Ok(settings)
}

pub fn get_hotkey_capabilities() -> HotkeyCapabilities {
    hotkey_capabilities()
}

pub fn get_hotkey_compositor_bindings(cx: &BeamContext) -> Result<CompositorBindings, String> {
    let store = open_store(cx)?;
    let mut settings = read_hotkey_settings(&store);
    settings
        .command_hotkeys
        .retain(|command_id, _| !custom_config::is_command_hidden(cx, command_id));
    let capabilities = hotkey_capabilities();
    Ok(build_compositor_bindings(&settings, &capabilities))
}

pub fn update_global_shortcut(
    cx: &BeamContext,
    shortcut: String,
) -> Result<HotkeyUpdateResult, String> {
    let normalized = normalize_hotkey_text(&shortcut);
    if normalized.is_empty() {
        return Ok(HotkeyUpdateResult {
            success: false,
            error: Some("invalid".to_string()),
        });
    }

    let store = open_store(cx)?;
    store
        .set(
            HOTKEYS_CONFIG.global_shortcut_key,
            &Value::String(normalized),
        )
        .map_err(|err| format!("failed to save global hotkey: {err}"))?;

    emit_settings_updated_event(cx);
    request_hotkey_runtime_reload();

    Ok(HotkeyUpdateResult {
        success: true,
        error: None,
    })
}

pub fn update_command_hotkey(
    cx: &BeamContext,
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
    if custom_config::is_command_hidden(cx, &normalized_command_id) {
        return Ok(CommandHotkeyUpdateResult {
            success: false,
            error: Some("command-hidden".to_string()),
            conflict_command_id: None,
        });
    }

    let normalized_hotkey = normalize_hotkey_text(&hotkey);
    let store = open_store(cx)?;
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
    emit_settings_updated_event(cx);
    request_hotkey_runtime_reload();

    Ok(CommandHotkeyUpdateResult {
        success: true,
        error: None,
        conflict_command_id: None,
    })
}

pub fn remove_command_hotkey(
    cx: &BeamContext,
    command_id: String,
) -> Result<HotkeyUpdateResult, String> {
    let normalized_command_id = command_id.trim().to_string();
    if normalized_command_id.is_empty() {
        return Ok(HotkeyUpdateResult {
            success: false,
            error: Some("invalid-command-id".to_string()),
        });
    }

    let store = open_store(cx)?;
    let mut settings = read_hotkey_settings(&store);
    settings.command_hotkeys.remove(&normalized_command_id);
    save_command_hotkeys(&store, &settings.command_hotkeys)?;
    emit_settings_updated_event(cx);
    request_hotkey_runtime_reload();

    Ok(HotkeyUpdateResult {
        success: true,
        error: None,
    })
}
