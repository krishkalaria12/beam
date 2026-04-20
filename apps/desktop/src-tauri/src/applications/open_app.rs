use std::process::{Command, Stdio};

use shell_words::split;
use tauri::{command, Window};

use super::error::{ApplicationsError, Result};

#[command]
pub fn open_application(window: Window, exec_path: String) -> Result<()> {
    let normalized_exec_path = exec_path.trim();
    if normalized_exec_path.is_empty() {
        return Err(ApplicationsError::LaunchingApplicationError(
            "application command is missing".to_string(),
        ));
    }

    let command_parts = split(normalized_exec_path)
        .map_err(|e| ApplicationsError::LaunchingApplicationError(e.to_string()))?;

    let (program, args) = command_parts.split_first().ok_or_else(|| {
        ApplicationsError::LaunchingApplicationError("application command is missing".to_string())
    })?;

    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    command
        .spawn()
        .map_err(|e| ApplicationsError::LaunchingApplicationError(e.to_string()))?;

    crate::launcher_window::hide_launcher_window_with_reset(&window)
        .map_err(ApplicationsError::HidingWindowApplicationError)?;

    Ok(())
}
