use std::collections::HashMap;
use std::ffi::OsString;
use std::path::Path;
use std::process::Stdio;
use std::time::Duration;

use tokio::process::Command;

use crate::script_commands::config::CONFIG as SCRIPT_COMMANDS_CONFIG;

use super::cache;
use super::discovery::resolve_script_commands_directory;
use super::error::{Result, ScriptCommandsError};
use super::runtime::read_shebang_args;
use super::types::{RunScriptCommandRequest, ScriptCommandSummary, ScriptExecutionResult};
use url::form_urlencoded;

fn trim_output(output: &[u8], max_bytes: usize) -> String {
    if output.len() <= max_bytes {
        return String::from_utf8_lossy(output).to_string();
    }

    let truncated = String::from_utf8_lossy(&output[..max_bytes]).to_string();
    format!("{truncated}\n...[truncated]")
}

fn first_non_empty_line(value: &str) -> String {
    value
        .lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn last_non_empty_line(value: &str) -> String {
    value
        .lines()
        .rev()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn resolve_target_command(
    app: &tauri::AppHandle,
    command_id: &str,
) -> Result<ScriptCommandSummary> {
    let commands = cache::get_script_commands(app)?;
    if let Some(command) = commands
        .into_iter()
        .find(|command| command.id == command_id)
    {
        return Ok(command);
    }

    cache::invalidate_script_commands_cache();
    let fresh_commands = cache::get_script_commands(app)?;
    fresh_commands
        .into_iter()
        .find(|command| command.id == command_id)
        .ok_or_else(|| ScriptCommandsError::ScriptCommandNotFound(command_id.to_string()))
}

fn ensure_script_path_is_within_root(app: &tauri::AppHandle, script_path: &Path) -> Result<()> {
    let root = resolve_script_commands_directory(app)?;
    if !script_path.starts_with(&root) {
        return Err(ScriptCommandsError::ScriptPathOutsideRoot);
    }
    Ok(())
}

fn argument_label(command: &super::types::ScriptCommandArgumentDefinition) -> String {
    if let Some(title) = command
        .title
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        return title.to_string();
    }

    let placeholder = command.placeholder.trim();
    if !placeholder.is_empty() {
        return placeholder.to_string();
    }

    command.name.clone()
}

fn normalize_script_arguments(
    command: &ScriptCommandSummary,
    provided_arguments: &HashMap<String, String>,
) -> Result<Vec<String>> {
    if command.argument_definitions.is_empty() {
        return Ok(Vec::new());
    }

    let mut args: Vec<String> = Vec::with_capacity(command.argument_definitions.len());
    let mut missing_required: Vec<String> = Vec::new();

    for definition in &command.argument_definitions {
        let value = provided_arguments
            .get(&definition.name)
            .map(String::as_str)
            .unwrap_or_default();

        if value.trim().is_empty() {
            if definition.required {
                missing_required.push(argument_label(definition));
            }
            args.push(String::new());
            continue;
        }

        let normalized = if definition.percent_encoded {
            form_urlencoded::byte_serialize(value.as_bytes()).collect::<String>()
        } else {
            value.to_string()
        };
        args.push(normalized);
    }

    if !missing_required.is_empty() {
        return Err(ScriptCommandsError::MissingRequiredArguments(
            missing_required.join(", "),
        ));
    }

    Ok(args)
}

fn build_process(
    command: &ScriptCommandSummary,
    script_path: &Path,
    script_args: &[String],
) -> Command {
    let script_path_string = script_path.to_string_lossy().to_string();
    let shebang_args = read_shebang_args(script_path);

    let mut process = if let Some(parts) = shebang_args {
        let mut process = Command::new(&parts[0]);
        if parts.len() > 1 {
            process.args(&parts[1..]);
        }
        process.arg(&script_path_string);
        process.args(script_args);
        process
    } else {
        let mut process = Command::new("/bin/bash");
        process.arg(&script_path_string);
        process.args(script_args);
        process
    };

    process
        .kill_on_drop(true)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(parent) = script_path.parent() {
        process.current_dir(parent);
    }

    let mut path_env = std::env::var_os("PATH").unwrap_or_default();
    if !path_env.is_empty() {
        path_env.push(OsString::from(":"));
    }
    path_env.push(OsString::from("/usr/local/bin"));
    process.env("PATH", path_env);
    process.env("BEAM_SCRIPT_COMMAND_ID", &command.id);
    process.env("BEAM_SCRIPT_NAME", &command.script_name);

    process
}

pub(super) async fn run_script_command(
    app: &tauri::AppHandle,
    request: RunScriptCommandRequest,
) -> Result<ScriptExecutionResult> {
    let command_id = request.command_id.trim();
    if command_id.is_empty() {
        return Err(ScriptCommandsError::InvalidCommandId);
    }

    let command = resolve_target_command(app, command_id)?;
    let script_path = Path::new(&command.script_path)
        .canonicalize()
        .map_err(|error| ScriptCommandsError::ResolveScriptPathFailed(error.to_string()))?;

    ensure_script_path_is_within_root(app, &script_path)?;

    let timeout_ms = request
        .timeout_ms
        .filter(|value| *value > 0)
        .unwrap_or(SCRIPT_COMMANDS_CONFIG.default_timeout_ms);
    let timeout = Duration::from_millis(timeout_ms);
    let output_limit = SCRIPT_COMMANDS_CONFIG.max_output_bytes;

    let script_args = normalize_script_arguments(&command, &request.arguments)?;
    let mut process = build_process(&command, &script_path, &script_args);
    let output = match tokio::time::timeout(timeout, process.output()).await {
        Ok(Ok(output)) => output,
        Ok(Err(error)) => return Err(ScriptCommandsError::ExecuteScriptFailed(error.to_string())),
        Err(_) => return Err(ScriptCommandsError::ScriptTimedOut(timeout_ms)),
    };

    let stdout = trim_output(&output.stdout, output_limit);
    let stderr = trim_output(&output.stderr, output_limit);
    let output_text = match (stdout.trim().is_empty(), stderr.trim().is_empty()) {
        (false, true) => stdout.clone(),
        (true, false) => stderr.clone(),
        (false, false) => format!("{stdout}\n{stderr}"),
        (true, true) => String::new(),
    };

    let first_line = first_non_empty_line(&output_text);
    let last_line = last_non_empty_line(&output_text);
    let exit_code = output.status.code().unwrap_or(1);
    let message = if exit_code == 0 {
        if last_line.is_empty() {
            "Script finished.".to_string()
        } else {
            last_line.clone()
        }
    } else if last_line.is_empty() {
        "Script failed.".to_string()
    } else {
        last_line.clone()
    };

    Ok(ScriptExecutionResult {
        command_id: command.id,
        title: command.title,
        script_path: script_path.to_string_lossy().to_string(),
        exit_code,
        stdout,
        stderr,
        output: output_text,
        first_line,
        last_line,
        message,
    })
}
