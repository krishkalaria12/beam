use std::{path::Path, time::SystemTime};

use jiff::Timestamp;
use walkdir::DirEntry;

use super::super::types::FileEntry;
use crate::config::config;

pub fn get_file_time(std_time: SystemTime) -> u64 {
    Timestamp::try_from(std_time)
        .map(|t| t.as_second() as u64)
        .unwrap_or(0)
}

pub fn is_ignored(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| config().FILE_IGNORED_FOLDERS.contains(&s))
        .unwrap_or(false)
}

pub fn normalize_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();
    if let Some(home) = dirs::home_dir() {
        if let Some(home_str) = home.to_str() {
            if path_str.starts_with(home_str) {
                return path_str.replace(home_str, "~").replace('\\', "/");
            }
        }
    }

    path_str.replace('\\', "/")
}

pub fn is_ignored_path(path: &Path) -> bool {
    for component in path.components() {
        return component
            .as_os_str()
            .to_str()
            .map(|s| config().FILE_IGNORED_FOLDERS.contains(&s))
            .unwrap_or(false);
    }

    if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
        if file_name.starts_with('.') {
            return true;
        }
    }

    false
}

pub fn get_file_metadata(path: &Path) -> std::io::Result<FileEntry> {
    let metadata = path.metadata()?;

    Ok(FileEntry {
        path: normalize_path(path),
        name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        size: metadata.len(),
        modified: get_file_time(metadata.modified().unwrap_or(std::time::UNIX_EPOCH)),
    })
}
