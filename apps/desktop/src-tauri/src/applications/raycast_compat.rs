use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::State;

#[cfg(target_os = "linux")]
use crate::linux_desktop;
#[cfg(target_os = "macos")]
use crate::macos;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RaycastCompatApplication {
    pub name: String,
    pub path: String,
    pub bundle_id: String,
    pub localized_name: String,
    pub windows_app_id: String,
}

#[tauri::command]
pub fn get_default_application(
    path: String,
) -> std::result::Result<RaycastCompatApplication, String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::applications::get_default_application(&path)
            .map_err(|error| error.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        return macos::applications::get_default_application(&path);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = path;
        Err("get_default_application is not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn get_frontmost_application(
    state: State<'_, AppState>,
) -> std::result::Result<RaycastCompatApplication, String> {
    #[cfg(target_os = "linux")]
    {
        let snapshot = crate::desktop::context::get_desktop_context_snapshot(&state);
        return snapshot.frontmost_application.value.ok_or_else(|| {
            snapshot
                .frontmost_application
                .reason
                .unwrap_or_else(|| "frontmost application is unavailable".to_string())
        });
    }

    #[cfg(target_os = "macos")]
    {
        let snapshot = crate::desktop::context::get_desktop_context_snapshot(&state);
        return snapshot.frontmost_application.value.ok_or_else(|| {
            snapshot
                .frontmost_application
                .reason
                .unwrap_or_else(|| "frontmost application is unavailable".to_string())
        });
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = state;
        Err("get_frontmost_application is not supported on this platform".to_string())
    }
}

#[tauri::command]
pub fn show_in_finder(path: String) -> std::result::Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return linux_desktop::applications::show_in_file_manager(&path)
            .map_err(|error| error.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        return macos::applications::show_in_file_manager(&path);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = path;
        Err("show_in_finder is not supported on this platform".to_string())
    }
}

fn try_trash_command(command_name: &str, args: &[&str]) -> std::result::Result<(), String> {
    let status = Command::new(command_name)
        .args(args)
        .status()
        .map_err(|error| format!("failed to execute {command_name}: {error}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("{command_name} exited with status code {status}"))
    }
}

fn native_trash(path: &str) -> std::result::Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        macos::workspace::trash_paths(&[crate::macos::applications::expand_tilde(path)])
    }

    #[cfg(target_os = "linux")]
    {
        try_trash_command("gio", &["trash", path])
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = path;
        Err("no native trash backend on this platform".to_string())
    }
}

#[tauri::command]
pub fn trash(paths: Vec<String>) -> std::result::Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }

    for path in paths {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            continue;
        }

        let native_result = native_trash(trimmed);
        if native_result.is_ok() {
            continue;
        }

        try_trash_command("trash-put", &[trimmed]).map_err(|fallback| {
            format!(
                "failed to trash '{trimmed}': {}; {}",
                native_result
                    .err()
                    .unwrap_or_else(|| "unknown native trash error".to_string()),
                fallback
            )
        })?;
    }

    Ok(())
}
