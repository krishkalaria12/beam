use freedesktop_file_parser::{parse, EntryType};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::command;
use walkdir::{DirEntry, WalkDir};

use crate::{
    applications::error::{Error, Result},
    config::config,
};

#[derive(Debug, Serialize)]
pub struct AppEntry {
    name: String,
    exec_path: String,
    icon: String,
}

fn is_desktop_file(entry: &DirEntry) -> bool {
    if entry.file_type().is_dir() {
        return true;
    }

    entry
        .file_name()
        .to_str()
        .map(|s| s.ends_with(".desktop"))
        .unwrap_or(false)
}

fn iterate_through_dir() -> Result<Vec<PathBuf>> {
    let directories = &config().DIRECTORIES_APPLICATION;
    let mut files: Vec<PathBuf> = Vec::new();

    for dir in directories {
        let walker = WalkDir::new(dir).into_iter();

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

    let mut applications: Vec<AppEntry> = Vec::new();

    for path in files {
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let desktop_file = parse(&content).map_err(|e| Error::ParsingDesktopFileError(e))?;

        let entry = desktop_file.entry;

        if let EntryType::Application(app) = &entry.entry_type {
            let icon = entry
                .icon
                .as_ref()
                .and_then(|i| i.get_icon_path())
                .unwrap_or_default();

            let name = entry.name.default;

            let exec_clean = app
                .exec
                .as_ref()
                .map(|s| s.as_str())
                .unwrap_or("")
                .split_whitespace()
                .filter(|s| !s.starts_with('%') || s.len() != 2)
                .collect::<Vec<_>>()
                .join(" ");

            applications.push(AppEntry {
                name,
                exec_path: exec_clean,
                icon: icon.to_string_lossy().into_owned(),
            });
        }
    }

    Ok(applications)
}
