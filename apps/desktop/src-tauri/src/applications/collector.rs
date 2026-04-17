use freedesktop_file_parser::{parse, DesktopEntry, DesktopFile, EntryType};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use walkdir::{DirEntry, WalkDir};

use super::{
    app_entry::{AppEntry, SearchableAppEntry},
    error::{ApplicationsError, Result},
    icon_resolver::IconResolver,
};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;

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
        .map(|name| name.ends_with(".desktop"))
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

fn iterate_through_application_directories() -> Result<Vec<PathBuf>> {
    let directories = APPLICATIONS_CONFIG.application_directories;
    let mut files = Vec::new();

    for directory in directories {
        let resolved_directory = expand_home(directory);
        if !resolved_directory.exists() {
            continue;
        }

        let walker = WalkDir::new(resolved_directory).into_iter();
        for entry in walker
            .filter_map(|entry| entry.ok())
            .filter(is_desktop_file)
        {
            files.push(entry.path().to_path_buf());
        }
    }

    Ok(files)
}

pub fn collect_applications(selected_icon_theme: Option<String>) -> Result<Vec<AppEntry>> {
    Ok(collect_searchable_applications(selected_icon_theme)?
        .into_iter()
        .map(|entry| entry.into_public_entry())
        .collect())
}

fn to_searchable_app_entry(
    path: &PathBuf,
    desktop_file: DesktopFile,
    icon_resolver: &mut IconResolver,
) -> Option<SearchableAppEntry> {
    let entry = desktop_file.entry;
    if entry.hidden.unwrap_or(false) || entry.no_display.unwrap_or(false) {
        return None;
    }

    let EntryType::Application(application_entry) = &entry.entry_type else {
        return None;
    };

    let icon = icon_resolver.resolve(entry.icon.as_ref(), path);
    if icon.is_empty() {
        return None;
    }

    let name = entry.name.default.trim().to_string();
    if name.is_empty() {
        return None;
    }

    let app_id = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or_default()
        .trim()
        .to_string();
    if app_id.is_empty() {
        return None;
    }

    let description = get_application_description(&entry);
    let generic_name = entry
        .generic_name
        .as_ref()
        .map(|value| value.default.trim().to_string())
        .unwrap_or_default();
    let comment = entry
        .comment
        .as_ref()
        .map(|value| value.default.trim().to_string())
        .unwrap_or_default();
    let keywords = application_entry
        .keywords
        .as_ref()
        .map(|values| values.default.clone())
        .unwrap_or_default()
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect();

    Some(SearchableAppEntry {
        app: AppEntry {
            app_id,
            name,
            description,
            exec_path: clean_exec_path(application_entry.exec.as_deref()),
            icon,
            desktop_file_path: path.to_string_lossy().to_string(),
        },
        generic_name,
        keywords,
        comment,
    })
}

pub fn collect_searchable_applications(
    selected_icon_theme: Option<String>,
) -> Result<Vec<SearchableAppEntry>> {
    let files = iterate_through_application_directories()
        .map_err(|e| ApplicationsError::CollectingDesktopFilesError(e.to_string()))?;
    let mut icon_resolver = IconResolver::new(selected_icon_theme);
    let mut applications = Vec::new();
    let mut seen_app_ids = HashSet::new();

    for path in files {
        let content = match fs::read_to_string(&path) {
            Ok(content) => content,
            Err(_) => continue,
        };

        let desktop_file = match parse(&content) {
            Ok(parsed) => parsed,
            Err(_) => continue,
        };

        let Some(application) = to_searchable_app_entry(&path, desktop_file, &mut icon_resolver)
        else {
            continue;
        };

        if !seen_app_ids.insert(application.app.app_id.clone()) {
            continue;
        }

        applications.push(application);
    }

    Ok(applications)
}
