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
use tauri::command;

pub fn invalidate_script_commands_cache() {
    cache::invalidate_script_commands_cache();
}

#[command]
pub fn get_script_commands_directory(app: tauri::AppHandle) -> Result<String> {
    let path = discovery::resolve_script_commands_directory(&app)?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn get_script_commands(app: tauri::AppHandle) -> Result<Vec<ScriptCommandSummary>> {
    cache::get_script_commands(&app)
}

#[command]
pub fn create_script_command(
    app: tauri::AppHandle,
    request: CreateScriptCommandRequest,
) -> Result<ScriptCommandSummary> {
    manage::create_script_command(&app, request)
}

#[command]
pub fn open_script_commands_directory(app: tauri::AppHandle) -> Result<()> {
    manage::open_script_commands_directory(&app)
}

#[command]
pub async fn run_script_command(
    app: tauri::AppHandle,
    request: RunScriptCommandRequest,
) -> Result<ScriptExecutionResult> {
    runner::run_script_command(&app, request).await
}
