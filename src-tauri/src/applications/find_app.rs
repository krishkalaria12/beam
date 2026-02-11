use freedesktop_file_parser::{parse, DesktopEntry, EntryType, IconString};
use serde::Serialize;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;
use walkdir::{DirEntry, WalkDir};

use crate::{
    applications::error::{Error, Result},
    config::config,
};

#[derive(Debug, Serialize)]
pub struct AppEntry {
    name: String,
    description: String,
    exec_path: String,
    icon: String,
}

fn canonicalize_path(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn get_allowed_icon_directories() -> Vec<PathBuf> {
    vec![
        expand_home("~/.local/share/icons"),
        expand_home("~/.icons"),
        PathBuf::from("/usr/share/icons"),
        PathBuf::from("/usr/local/share/icons"),
        PathBuf::from("/usr/share/pixmaps"),
        PathBuf::from("/var/lib/flatpak/exports/share/icons"),
        PathBuf::from("/var/lib/snapd/desktop/icons"),
    ]
    .into_iter()
    .map(|path| canonicalize_path(&path))
    .collect()
}

fn to_allowed_icon_path(
    path: PathBuf,
    allowed_icon_directories: &[PathBuf],
    home_local_directory: &Path,
) -> Option<String> {
    let normalized_path = canonicalize_path(&path);

    let is_within_allowed_icons_directory = allowed_icon_directories
        .iter()
        .any(|allowed| normalized_path.starts_with(allowed));

    let is_within_home_local_icons_directory = normalized_path.starts_with(home_local_directory)
        && normalized_path
            .components()
            .any(|component| component.as_os_str() == OsStr::new("icons"));

    if is_within_allowed_icons_directory || is_within_home_local_icons_directory {
        Some(normalized_path.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn resolve_icon_path(
    icon: Option<&IconString>,
    desktop_file_path: &Path,
    allowed_icon_directories: &[PathBuf],
    home_local_directory: &Path,
) -> String {
    let Some(icon) = icon else {
        return String::new();
    };

    let raw_icon = icon.content.trim();
    if raw_icon.is_empty() {
        return String::new();
    }

    if let Some(path) = icon.get_icon_path() {
        if let Some(path) =
            to_allowed_icon_path(path, allowed_icon_directories, home_local_directory)
        {
            return path;
        }
    }

    if let Some(local_path) = raw_icon.strip_prefix("file://") {
        let local_path = PathBuf::from(local_path);
        if local_path.exists() {
            if let Some(path) =
                to_allowed_icon_path(local_path, allowed_icon_directories, home_local_directory)
            {
                return path;
            }
        }
    }

    let absolute_path = PathBuf::from(raw_icon);
    if absolute_path.is_absolute() && absolute_path.exists() {
        if let Some(path) = to_allowed_icon_path(
            absolute_path,
            allowed_icon_directories,
            home_local_directory,
        ) {
            return path;
        }
    }

    if let Some(parent_dir) = desktop_file_path.parent() {
        let relative_path = parent_dir.join(raw_icon);
        if relative_path.exists() {
            if let Some(path) = to_allowed_icon_path(
                relative_path,
                allowed_icon_directories,
                home_local_directory,
            ) {
                return path;
            }
        }
    }

    for size in [24, 32, 48, 64, 96, 128] {
        if let Some(path) = freedesktop_icons::lookup(raw_icon)
            .with_size(size)
            .with_scale(1)
            .with_cache()
            .find()
        {
            if let Some(path) =
                to_allowed_icon_path(path, allowed_icon_directories, home_local_directory)
            {
                return path;
            }
        }
    }

    String::new()
}

fn get_application_description(entry: &DesktopEntry) -> String {
    let description = entry
        .comment
        .as_ref()
        .map(|comment| comment.default.trim().to_string())
        .filter(|description| !description.is_empty())
        .or_else(|| {
            entry
                .generic_name
                .as_ref()
                .map(|generic_name| generic_name.default.trim().to_string())
                .filter(|generic_name| !generic_name.is_empty())
        });

    description.unwrap_or_else(|| "launch application".to_string())
}

fn clean_exec_path(exec: Option<&str>) -> String {
    exec.unwrap_or("")
        .split_whitespace()
        .filter(|token| !token.starts_with('%') || token.len() != 2)
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn is_desktop_file(entry: &DirEntry) -> bool {
    if !entry.file_type().is_file() {
        return false;
    }

    entry
        .file_name()
        .to_str()
        .map(|s| s.ends_with(".desktop"))
        .unwrap_or(false)
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

fn iterate_through_dir() -> Result<Vec<PathBuf>> {
    let directories = &config().DIRECTORIES_APPLICATION;
    let mut files: Vec<PathBuf> = Vec::new();

    for dir in directories {
        let resolved_dir = expand_home(dir);

        if !resolved_dir.exists() {
            continue;
        }

        let walker = WalkDir::new(resolved_dir).into_iter();

        for entry in walker.filter_map(|e| e.ok()).filter(|e| is_desktop_file(e)) {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok(files)
}

#[command]
pub fn get_applications() -> Result<Vec<AppEntry>> {
    let files =
        iterate_through_dir().map_err(|e| Error::CollectingDesktopFilesError(e.to_string()))?;
    let allowed_icon_directories = get_allowed_icon_directories();
    let home_local_directory = canonicalize_path(&expand_home("~/.local"));

    let mut applications: Vec<AppEntry> = Vec::new();

    for path in files {
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let desktop_file = match parse(&content) {
            Ok(parsed) => parsed,
            Err(_) => continue,
        };

        let entry = desktop_file.entry;

        if entry.hidden.unwrap_or(false) || entry.no_display.unwrap_or(false) {
            continue;
        }

        if let EntryType::Application(app) = &entry.entry_type {
            let icon = resolve_icon_path(
                entry.icon.as_ref(),
                &path,
                &allowed_icon_directories,
                &home_local_directory,
            );
            if icon.is_empty() {
                continue;
            }

            let name = entry.name.default.trim().to_string();
            if name.is_empty() {
                continue;
            }

            let description = get_application_description(&entry);
            let exec_clean = clean_exec_path(app.exec.as_deref());

            applications.push(AppEntry {
                name,
                description,
                exec_path: exec_clean,
                icon,
            });
        }
    }

    Ok(applications)
}
