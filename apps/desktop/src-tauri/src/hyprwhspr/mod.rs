pub mod error;

use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};
use tauri::{command, Window};

use self::error::{HyprWhsprError, Result};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HyprWhsprRecordAction {
    Start,
    Stop,
    Cancel,
    Toggle,
    Status,
}

impl HyprWhsprRecordAction {
    fn as_arg(self) -> &'static str {
        match self {
            HyprWhsprRecordAction::Start => "start",
            HyprWhsprRecordAction::Stop => "stop",
            HyprWhsprRecordAction::Cancel => "cancel",
            HyprWhsprRecordAction::Toggle => "toggle",
            HyprWhsprRecordAction::Status => "status",
        }
    }
}

impl std::fmt::Display for HyprWhsprRecordAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_arg())
    }
}

fn stream_to_text(output: &[u8]) -> String {
    String::from_utf8_lossy(output).trim().to_string()
}

fn merge_stream_output(stdout: &[u8], stderr: &[u8]) -> String {
    let stdout_text = stream_to_text(stdout);
    let stderr_text = stream_to_text(stderr);

    match (stdout_text.is_empty(), stderr_text.is_empty()) {
        (false, true) => stdout_text,
        (true, false) => stderr_text,
        (false, false) => format!("stdout:\n{stdout_text}\n\nstderr:\n{stderr_text}"),
        (true, true) => String::new(),
    }
}

fn run_hyprwhspr_command(args: &[&str], command_name: &str) -> Result<String> {
    let output = Command::new("hyprwhspr")
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|error| HyprWhsprError::LaunchFailed(error.to_string()))?;

    if !output.status.success() {
        let stderr = stream_to_text(&output.stderr);
        let stdout = stream_to_text(&output.stdout);
        let reason = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("command exited with status {}", output.status)
        };

        return Err(HyprWhsprError::GeneralCommandFailed {
            command: command_name.to_string(),
            reason,
        });
    }

    Ok(merge_stream_output(&output.stdout, &output.stderr))
}

#[command]
pub fn hyprwhspr_record(
    window: Window,
    action: HyprWhsprRecordAction,
    hide_window: Option<bool>,
) -> Result<String> {
    if !cfg!(target_os = "linux") {
        return Err(HyprWhsprError::UnsupportedPlatform);
    }

    let output = run_hyprwhspr_command(&["record", action.as_arg()], "record").map_err(
        |error| match error {
            HyprWhsprError::GeneralCommandFailed { reason, .. } => {
                HyprWhsprError::CommandFailed { action, reason }
            }
            other => other,
        },
    )?;

    let should_hide_window =
        hide_window.unwrap_or(true) && !matches!(action, HyprWhsprRecordAction::Status);

    if should_hide_window {
        crate::launcher_window::hide_launcher_window_with_reset(&window)
            .map_err(HyprWhsprError::HideWindowFailed)?;
    }

    Ok(output)
}

#[command]
pub fn hyprwhspr_record_status() -> Result<String> {
    if !cfg!(target_os = "linux") {
        return Err(HyprWhsprError::UnsupportedPlatform);
    }

    run_hyprwhspr_command(&["record", "status"], "record status")
}
