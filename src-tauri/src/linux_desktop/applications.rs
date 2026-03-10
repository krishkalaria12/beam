use freedesktop_file_parser::{parse, EntryType};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

use crate::applications::raycast_compat::RaycastCompatApplication;
use crate::config::config;
use crate::linux_desktop::window_manager::{self, FocusedWindowInfo};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DesktopApplicationRecord {
    desktop_id: String,
    name: String,
    exec_path: String,
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(path)
}

fn desktop_entry_paths() -> Vec<PathBuf> {
    config()
        .FILE_DIRECTORIES_APPLICATION
        .iter()
        .map(|entry| expand_home(entry))
        .filter(|path| path.exists())
        .collect()
}

fn desktop_id_from_path(path: &Path) -> Option<String> {
    path.file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_string())
        .filter(|value| value.ends_with(".desktop"))
}

fn scan_desktop_applications() -> Vec<DesktopApplicationRecord> {
    let mut results = Vec::new();
    for base in desktop_entry_paths() {
        for entry in WalkDir::new(base).into_iter().filter_map(Result::ok) {
            if !entry.file_type().is_file() {
                continue;
            }
            let Some(desktop_id) = desktop_id_from_path(entry.path()) else {
                continue;
            };
            let Ok(contents) = fs::read_to_string(entry.path()) else {
                continue;
            };
            let Ok(parsed) = parse(&contents) else {
                continue;
            };
            let EntryType::Application(application) = parsed.entry.entry_type else {
                continue;
            };
            let name = parsed.entry.name.default.trim().to_string();
            if name.is_empty() {
                continue;
            }
            let exec_path = application
                .exec
                .as_deref()
                .unwrap_or_default()
                .split_whitespace()
                .filter(|token| !token.starts_with('%') || token.len() != 2)
                .collect::<Vec<_>>()
                .join(" ")
                .trim()
                .to_string();
            results.push(DesktopApplicationRecord {
                desktop_id,
                name,
                exec_path,
            });
        }
    }
    results
}

fn find_desktop_application_by_id(desktop_id: &str) -> Option<DesktopApplicationRecord> {
    scan_desktop_applications()
        .into_iter()
        .find(|entry| entry.desktop_id == desktop_id)
}

fn find_desktop_application_by_window(
    info: &FocusedWindowInfo,
) -> Option<DesktopApplicationRecord> {
    let process_path = info
        .pid
        .and_then(|pid| fs::read_link(format!("/proc/{pid}/exe")).ok())
        .map(|path| path.to_string_lossy().to_string());
    let class_lower = info.class_name.trim().to_lowercase();
    let app_id_lower = info
        .app_id
        .as_deref()
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();
    let app_name_lower = info.app_name.trim().to_lowercase();

    scan_desktop_applications().into_iter().find(|entry| {
        let desktop_id_lower = entry.desktop_id.to_lowercase();
        let name_lower = entry.name.to_lowercase();
        let exec_lower = entry.exec_path.to_lowercase();

        (!class_lower.is_empty()
            && (desktop_id_lower.contains(&class_lower)
                || name_lower.contains(&class_lower)
                || exec_lower.contains(&class_lower)))
            || (!app_id_lower.is_empty()
                && (desktop_id_lower.contains(&app_id_lower)
                    || name_lower.contains(&app_id_lower)
                    || exec_lower.contains(&app_id_lower)))
            || (!app_name_lower.is_empty()
                && (name_lower.contains(&app_name_lower)
                    || desktop_id_lower.contains(&app_name_lower)))
            || process_path
                .as_deref()
                .map(|path| !path.is_empty() && exec_lower.contains(&path.to_lowercase()))
                .unwrap_or(false)
    })
}

fn parse_gio_default_desktop_id(output: &str) -> Option<String> {
    output
        .lines()
        .find_map(|line| line.split(':').nth(1))
        .map(|value| value.trim().trim_end_matches(';').to_string())
        .filter(|value| value.ends_with(".desktop"))
}

fn mime_query_target(target: &str) -> Result<String, String> {
    if let Ok(url) = url::Url::parse(target) {
        let scheme = url.scheme().trim();
        if !scheme.is_empty() && scheme != "file" {
            return Ok(format!("x-scheme-handler/{scheme}"));
        }
    }

    mime_type_for_target(target)
}

fn mime_type_for_target(target: &str) -> Result<String, String> {
    let gio_output = Command::new("gio")
        .args(["info", "--attributes=standard::content-type", target])
        .output();
    if let Ok(output) = gio_output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(mime) = stdout
                .lines()
                .find_map(|line| line.split(':').nth(1))
                .map(str::trim)
            {
                if !mime.is_empty() {
                    return Ok(mime.to_string());
                }
            }
        }
    }

    let output = Command::new("xdg-mime")
        .args(["query", "filetype", target])
        .output()
        .map_err(|error| format!("failed to execute xdg-mime: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn default_desktop_id_for_target(target: &str) -> Result<String, String> {
    let mime = mime_query_target(target)?;

    let gio_output = Command::new("gio").args(["mime", &mime]).output();
    if let Ok(output) = gio_output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(desktop_id) = parse_gio_default_desktop_id(&stdout) {
                return Ok(desktop_id);
            }
        }
    }

    let output = Command::new("xdg-mime")
        .args(["query", "default", &mime])
        .output()
        .map_err(|error| format!("failed to execute xdg-mime: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let desktop_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if desktop_id.is_empty() {
        return Err(format!(
            "no default application is registered for MIME type {mime}"
        ));
    }
    Ok(desktop_id)
}

fn to_raycast_application(record: DesktopApplicationRecord) -> RaycastCompatApplication {
    RaycastCompatApplication {
        name: record.name.clone(),
        path: record.exec_path.clone(),
        bundle_id: record.desktop_id.clone(),
        localized_name: record.name,
        windows_app_id: record.desktop_id,
    }
}

pub fn get_frontmost_application(state: &AppState) -> Result<RaycastCompatApplication, String> {
    let focused = window_manager::frontmost_window(state)?
        .ok_or_else(|| "could not determine the frontmost application".to_string())?;
    let record = find_desktop_application_by_window(&focused).unwrap_or(DesktopApplicationRecord {
        desktop_id: focused
            .app_id
            .clone()
            .unwrap_or_else(|| focused.class_name.clone()),
        name: focused.app_name.clone(),
        exec_path: focused
            .pid
            .and_then(|pid| fs::read_link(format!("/proc/{pid}/exe")).ok())
            .map(|path| path.to_string_lossy().to_string())
            .unwrap_or_default(),
    });

    if record.name.trim().is_empty() {
        return Err("could not resolve the frontmost application".to_string());
    }

    Ok(to_raycast_application(record))
}

pub fn get_default_application(target: &str) -> Result<RaycastCompatApplication, String> {
    let desktop_id = default_desktop_id_for_target(target)?;
    let record = find_desktop_application_by_id(&desktop_id)
        .ok_or_else(|| format!("failed to map desktop entry {desktop_id} to an application"))?;
    Ok(to_raycast_application(record))
}

pub fn show_in_file_manager(target: &str) -> Result<(), String> {
    let absolute = fs::canonicalize(target)
        .unwrap_or_else(|_| PathBuf::from(target))
        .to_string_lossy()
        .to_string();
    let uri = if absolute.starts_with("file://") {
        absolute.clone()
    } else {
        format!("file://{absolute}")
    };

    let gdbus_output = Command::new("gdbus")
        .args([
            "call",
            "--session",
            "--dest",
            "org.freedesktop.FileManager1",
            "--object-path",
            "/org/freedesktop/FileManager1",
            "--method",
            "org.freedesktop.FileManager1.ShowItems",
            &format!("[\"{uri}\"]"),
            "",
        ])
        .output();
    if let Ok(output) = gdbus_output {
        if output.status.success() {
            return Ok(());
        }
    }

    let gio_status = Command::new("gio").args(["open", &absolute]).status();
    if let Ok(status) = gio_status {
        if status.success() {
            return Ok(());
        }
    }

    Command::new("xdg-open")
        .arg(&absolute)
        .spawn()
        .map_err(|error| format!("failed to show item in file manager: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{mime_query_target, parse_gio_default_desktop_id};

    #[test]
    fn parses_gio_mime_output() {
        let output = "Default application for “text/plain”: org.gnome.TextEditor.desktop\n";
        assert_eq!(
            parse_gio_default_desktop_id(output).as_deref(),
            Some("org.gnome.TextEditor.desktop")
        );
    }

    #[test]
    fn maps_url_target_to_scheme_handler() {
        assert_eq!(
            mime_query_target("https://example.com").as_deref(),
            Ok("x-scheme-handler/https")
        );
    }
}
