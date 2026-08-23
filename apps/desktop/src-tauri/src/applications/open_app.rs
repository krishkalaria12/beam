#[cfg(not(target_os = "macos"))]
use std::process::{Command, Stdio};

#[cfg(not(target_os = "macos"))]
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

    #[cfg(target_os = "macos")]
    {
        // Application bundles are launched through NSWorkspace/open so spaces,
        // dock state and single-instance semantics stay intact.
        crate::macos::applications::open_application(normalized_exec_path)
            .map_err(ApplicationsError::LaunchingApplicationError)?;

        crate::launcher_window::hide_launcher_window_with_reset(&window)
            .map_err(ApplicationsError::HidingWindowApplicationError)?;

        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        launch_posix_command(normalized_exec_path)
            .map_err(ApplicationsError::LaunchingApplicationError)?;

        crate::launcher_window::hide_launcher_window_with_reset(&window)
            .map_err(ApplicationsError::HidingWindowApplicationError)?;

        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
fn launch_posix_command(normalized_exec_path: &str) -> std::result::Result<(), String> {
    let command_parts = split(normalized_exec_path).map_err(|e| e.to_string())?;

    let (program, args) = command_parts
        .split_first()
        .ok_or_else(|| "application command is missing".to_string())?;

    Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
