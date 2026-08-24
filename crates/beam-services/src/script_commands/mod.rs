// PORT: apps/desktop/src-tauri/src/script_commands/mod.rs
mod cache;
pub(crate) mod config;
mod discovery;
mod error;
mod manage;
mod metadata;
mod runner;
mod runtime;
pub mod types;

use self::error::Result;
use self::types::{
    CreateScriptCommandRequest, RunScriptCommandRequest, ScriptCommandSummary,
    ScriptExecutionResult,
};
use beam_core::BeamContext;

pub fn invalidate_script_commands_cache() {
    cache::invalidate_script_commands_cache();
}

pub fn get_script_commands_directory(cx: &BeamContext) -> Result<String> {
    let path = discovery::resolve_script_commands_directory(cx)?;
    Ok(path.to_string_lossy().to_string())
}

pub fn get_script_commands(cx: &BeamContext) -> Result<Vec<ScriptCommandSummary>> {
    cache::get_script_commands(cx)
}

pub fn create_script_command(
    cx: &BeamContext,
    request: CreateScriptCommandRequest,
) -> Result<ScriptCommandSummary> {
    manage::create_script_command(cx, request)
}

pub fn open_script_commands_directory(cx: &BeamContext) -> Result<()> {
    manage::open_script_commands_directory(cx)
}

pub async fn run_script_command(
    cx: &BeamContext,
    request: RunScriptCommandRequest,
) -> Result<ScriptExecutionResult> {
    runner::run_script_command(cx, request).await
}
