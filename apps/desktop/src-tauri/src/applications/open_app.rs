use std::process::{Command, Stdio};

#[cfg(not(target_os = "windows"))]
use shell_words::split;
use tauri::{command, Window};

use super::error::{ApplicationsError, Result};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[command]
pub fn open_application(window: Window, exec_path: String) -> Result<()> {
    let normalized_exec_path = exec_path.trim();
    if normalized_exec_path.is_empty() {
        return Err(ApplicationsError::LaunchingApplicationError(
            "application command is missing".to_string(),
        ));
    }

    spawn_platform(normalized_exec_path)?;

    crate::launcher_window::hide_launcher_window_with_reset(&window)
        .map_err(ApplicationsError::HidingWindowApplicationError)?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn spawn_platform(exec_path: &str) -> Result<()> {
    use std::os::windows::process::CommandExt;
    use std::path::Path;

    let path = Path::new(exec_path);
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let looks_executable = matches!(extension.as_str(), "exe" | "com" | "bat" | "cmd");

    if path.is_file() && looks_executable {
        // Executables spawn directly so console apps do not flash a shell window.
        Command::new(path)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| ApplicationsError::LaunchingApplicationError(e.to_string()))?;
        return Ok(());
    }

    // Documents, shortcuts, URLs and everything else go through the shell so
    // default handlers resolve exactly like a Start Menu launch.
    Command::new("explorer.exe")
        .arg(exec_path)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| ApplicationsError::LaunchingApplicationError(e.to_string()))?;

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn spawn_platform(exec_path: &str) -> Result<()> {
    let command_parts = split(exec_path)
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

    Ok(())
}
