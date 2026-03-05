use std::path::Path;
use std::process::Command;

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaycastCompatApplication {
    pub name: String,
    pub path: String,
    pub bundle_id: String,
    pub localized_name: String,
    pub windows_app_id: String,
}

fn default_linux_application() -> RaycastCompatApplication {
    RaycastCompatApplication {
        name: "Default Application".to_string(),
        path: "xdg-open".to_string(),
        bundle_id: "xdg-open".to_string(),
        localized_name: "Default Application".to_string(),
        windows_app_id: "xdg-open".to_string(),
    }
}

#[tauri::command]
pub fn get_default_application(_path: String) -> std::result::Result<RaycastCompatApplication, String> {
    Ok(default_linux_application())
}

#[tauri::command]
pub fn get_frontmost_application() -> std::result::Result<RaycastCompatApplication, String> {
    let executable = std::env::current_exe()
        .ok()
        .and_then(|path| path.to_str().map(|value| value.to_string()))
        .unwrap_or_else(|| "beam".to_string());

    Ok(RaycastCompatApplication {
        name: "Beam".to_string(),
        path: executable.clone(),
        bundle_id: "beam".to_string(),
        localized_name: "Beam".to_string(),
        windows_app_id: executable,
    })
}

#[tauri::command]
pub fn show_in_finder(path: String) -> std::result::Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("path is required".to_string());
    }

    let resolved = {
        let target = Path::new(trimmed);
        if target.is_file() {
            target
                .parent()
                .map(|parent| parent.to_string_lossy().to_string())
                .unwrap_or_else(|| trimmed.to_string())
        } else {
            trimmed.to_string()
        }
    };

    Command::new("xdg-open")
        .arg(resolved)
        .spawn()
        .map_err(|error| format!("failed to launch xdg-open: {error}"))?;

    Ok(())
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
                gio_result.err().unwrap_or_else(|| "unknown gio error".to_string()),
                fallback
                    .err()
                    .unwrap_or_else(|| "unknown trash-put error".to_string())
            ));
        }
    }

    Ok(())
}
