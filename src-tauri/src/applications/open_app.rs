use std::process::{Command, Stdio};

use shell_words::split;
use tauri::{command, AppHandle};

use crate::applications::error::{Error, Result};

#[command]
pub fn open_application(app: AppHandle, exec_path: String) -> Result<()> {
    let normalized_exec_path = exec_path.trim();
    if normalized_exec_path.is_empty() {
        return Err(Error::LaunchingApplicationError(
            "application command is missing".to_string(),
        ));
    }

    let command_parts =
        split(normalized_exec_path).map_err(|e| Error::LaunchingApplicationError(e.to_string()))?;

    let (program, args) = command_parts.split_first().ok_or_else(|| {
        Error::LaunchingApplicationError("application command is missing".to_string())
    })?;

    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    command
        .spawn()
        .map_err(|e| Error::LaunchingApplicationError(e.to_string()))?;

    // close the launcher
    app.exit(0);

    Ok(())
}
