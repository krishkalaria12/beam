use std::time::{Duration, Instant};

use parking_lot::Mutex;

use crate::script_commands::config::CONFIG as SCRIPT_COMMANDS_CONFIG;

use super::discovery::{discover_script_commands, resolve_script_commands_directory};
use super::error::Result;
use super::types::ScriptCommandSummary;

struct ScriptCommandsDiscoveryCache {
    generated_at: Instant,
    commands: Vec<ScriptCommandSummary>,
}

static SCRIPT_COMMANDS_CACHE: Mutex<Option<ScriptCommandsDiscoveryCache>> = Mutex::new(None);

pub(super) fn invalidate_script_commands_cache() {
    let mut cache = SCRIPT_COMMANDS_CACHE.lock();
    *cache = None;
}

pub(super) fn get_script_commands(app: &tauri::AppHandle) -> Result<Vec<ScriptCommandSummary>> {
    let ttl = Duration::from_millis(SCRIPT_COMMANDS_CONFIG.discovery_cache_ttl_ms);

    {
        let cache = SCRIPT_COMMANDS_CACHE.lock();
        if let Some(cache_entry) = cache.as_ref() {
            if cache_entry.generated_at.elapsed() < ttl {
                return Ok(cache_entry.commands.clone());
            }
        }
    }

    let script_root = resolve_script_commands_directory(app)?;
    let discovered = discover_script_commands(&script_root);

    let mut cache = SCRIPT_COMMANDS_CACHE.lock();
    *cache = Some(ScriptCommandsDiscoveryCache {
        generated_at: Instant::now(),
        commands: discovered.clone(),
    });

    Ok(discovered)
}
