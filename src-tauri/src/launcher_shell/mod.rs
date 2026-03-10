mod error;

use std::ffi::OsStr;
use std::process::Stdio;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::command;

use self::error::{LauncherShellError, Result};
use crate::config::config;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteShellCommandRequest {
    pub command: String,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteShellCommandResponse {
    pub command: String,
    pub shell_program: String,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub output: String,
    pub duration_ms: u64,
    pub timed_out: bool,
    pub success: bool,
}

fn normalize_timeout_ms(timeout_ms: Option<u64>) -> u64 {
    let cfg = config();
    timeout_ms
        .unwrap_or(cfg.LAUNCHER_SHELL_DEFAULT_TIMEOUT_MS)
        .clamp(
            cfg.LAUNCHER_SHELL_POLL_INTERVAL_MS,
            cfg.LAUNCHER_SHELL_MAX_TIMEOUT_MS,
        )
}

fn shell_name(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .and_then(OsStr::to_str)
        .map(str::to_ascii_lowercase)
        .unwrap_or_else(|| path.to_ascii_lowercase())
}

fn resolve_shell() -> (String, Vec<&'static str>) {
    #[cfg(target_os = "windows")]
    let shell_program = std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string());

    #[cfg(not(target_os = "windows"))]
    let shell_program = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());

    let shell_name = shell_name(&shell_program);
    let shell_args = if shell_name == "cmd" || shell_name == "cmd.exe" {
        vec!["/C"]
    } else if matches!(
        shell_name.as_str(),
        "powershell" | "powershell.exe" | "pwsh" | "pwsh.exe"
    ) {
        vec!["-NoProfile", "-Command"]
    } else if shell_name == "nu" || shell_name == "nu.exe" {
        vec!["-c"]
    } else {
        vec!["-lc"]
    };

    (shell_program, shell_args)
}

fn decode_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

fn combine_output(stdout: &str, stderr: &str) -> String {
    match (stdout.trim_end().is_empty(), stderr.trim_end().is_empty()) {
        (true, true) => String::new(),
        (false, true) => stdout.to_string(),
        (true, false) => stderr.to_string(),
        (false, false) => format!("{stdout}\n{stderr}"),
    }
}

fn run_shell_command(request: ExecuteShellCommandRequest) -> Result<ExecuteShellCommandResponse> {
    let normalized_command = request.command.trim().to_string();
    if normalized_command.is_empty() {
        return Err(LauncherShellError::EmptyCommand);
    }

    let timeout = Duration::from_millis(normalize_timeout_ms(request.timeout_ms));
    let (shell_program, shell_args) = resolve_shell();

    let mut child = std::process::Command::new(&shell_program)
        .args(&shell_args)
        .arg(&normalized_command)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| LauncherShellError::SpawnFailed {
            shell: shell_program.clone(),
            reason: error.to_string(),
        })?;

    let started_at = Instant::now();
    let poll_interval = Duration::from_millis(config().LAUNCHER_SHELL_POLL_INTERVAL_MS);
    let mut timed_out = false;

    loop {
        if child
            .try_wait()
            .map_err(|error| LauncherShellError::PollFailed(error.to_string()))?
            .is_some()
        {
            break;
        }

        if started_at.elapsed() >= timeout {
            timed_out = true;
            child.kill().ok();
            break;
        }

        std::thread::sleep(poll_interval);
    }

    let output = child
        .wait_with_output()
        .map_err(|error| LauncherShellError::CollectOutputFailed(error.to_string()))?;
    let stdout = decode_output(&output.stdout);
    let mut stderr = decode_output(&output.stderr);
    if timed_out {
        if !stderr.trim_end().is_empty() {
            stderr.push('\n');
        }
        stderr.push_str("Command timed out.");
    }

    let duration_ms = started_at.elapsed().as_millis().min(u128::from(u64::MAX)) as u64;
    let exit_code = output.status.code();
    let success = !timed_out && output.status.success();

    Ok(ExecuteShellCommandResponse {
        command: normalized_command,
        shell_program,
        exit_code,
        output: combine_output(&stdout, &stderr),
        stdout,
        stderr,
        duration_ms,
        timed_out,
        success,
    })
}

#[command]
pub async fn execute_shell_command(
    request: ExecuteShellCommandRequest,
) -> Result<ExecuteShellCommandResponse> {
    tauri::async_runtime::spawn_blocking(move || run_shell_command(request))
        .await
        .map_err(|error| LauncherShellError::TaskJoinFailed(error.to_string()))?
}
