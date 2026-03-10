use serde::Serialize;
use std::process::Command;
use tauri::State;

use crate::{linux_desktop, state::AppState};

#[derive(Debug, Serialize)]
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

    #[cfg(not(target_os = "linux"))]
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
        return linux_desktop::applications::get_frontmost_application(&state)
            .map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "linux"))]
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

    #[cfg(not(target_os = "linux"))]
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

        let gio_result = try_trash_command("gio", &["trash", trimmed]);
        if gio_result.is_ok() {
            continue;
        }

        let fallback = try_trash_command("trash-put", &[trimmed]);
        if fallback.is_err() {
            return Err(format!(
                "failed to trash '{trimmed}': {}; {}",
                gio_result
                    .err()
                    .unwrap_or_else(|| "unknown gio error".to_string()),
                fallback
                    .err()
                    .unwrap_or_else(|| "unknown trash-put error".to_string())
            ));
        }
    }

    Ok(())
}
