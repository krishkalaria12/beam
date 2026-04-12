pub(crate) mod config;
pub mod error;

pub use error::Result;

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use self::config::CONFIG as LAUNCHER_THEME_CONFIG;
use crate::config::CONFIG as APP_CONFIG;
use crate::launcher_theme::error::LauncherThemeError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherThemeSummary {
    pub id: String,
    pub name: String,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherThemeManifestFile {
    id: Option<String>,
    name: Option<String>,
    version: Option<String>,
    author: Option<String>,
    description: Option<String>,
}

fn normalize_theme_id(raw: &str) -> Option<String> {
    let normalized = raw.trim().to_ascii_lowercase();
    if normalized.is_empty()
        || normalized.starts_with('-')
        || normalized.ends_with('-')
        || normalized.contains("--")
    {
        return None;
    }

    if normalized
        .chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-')
    {
        return Some(normalized);
    }

    None
}

fn resolve_themes_dir(app: &AppHandle) -> Result<PathBuf> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|err| LauncherThemeError::AppConfigDirUnavailable(err.to_string()))?;
    Ok(config_dir.join(cfg.directory_name))
}

fn resolve_theme_manifest(theme_dir: &Path) -> Result<LauncherThemeSummary> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let folder_name = theme_dir
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or(LauncherThemeError::InvalidDirectoryName)?;
    let fallback_id = normalize_theme_id(folder_name)
        .ok_or_else(|| LauncherThemeError::InvalidFolderName(folder_name.to_string()))?;

    let manifest_path = theme_dir.join(cfg.manifest_file_name);
    let manifest_raw = fs::read_to_string(&manifest_path)
        .map_err(|_| LauncherThemeError::ManifestNotFound(manifest_path.display().to_string()))?;
    let manifest: LauncherThemeManifestFile = serde_json::from_str(&manifest_raw)
        .map_err(|e| LauncherThemeError::ManifestParse(e.to_string()))?;

    let id = manifest
        .id
        .as_deref()
        .and_then(normalize_theme_id)
        .unwrap_or(fallback_id);
    let name = manifest
        .name
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| id.clone());

    Ok(LauncherThemeSummary {
        id,
        name,
        version: manifest.version.map(|value| value.trim().to_string()),
        author: manifest.author.map(|value| value.trim().to_string()),
        description: manifest.description.map(|value| value.trim().to_string()),
    })
}

fn discover_themes_with_paths(app: &AppHandle) -> Result<Vec<(LauncherThemeSummary, PathBuf)>> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let themes_dir = resolve_themes_dir(app)?;
    if !themes_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&themes_dir)
        .map_err(|e| LauncherThemeError::ThemesDirectoryRead(e.to_string()))?;

    let mut discovered: Vec<(LauncherThemeSummary, PathBuf)> = Vec::new();

    for entry in entries.flatten() {
        let theme_dir = entry.path();
        if !theme_dir.is_dir() {
            continue;
        }

        let stylesheet_path = theme_dir.join(cfg.stylesheet_file_name);
        if !stylesheet_path.is_file() {
            continue;
        }

        match resolve_theme_manifest(&theme_dir) {
            Ok(summary) => discovered.push((summary, theme_dir)),
            Err(error) => {
                log::warn!(
                    "skipping invalid launcher theme '{}': {error}",
                    theme_dir.display()
                );
            }
        }
    }

    discovered.sort_by(|left, right| {
        left.0
            .name
            .to_ascii_lowercase()
            .cmp(&right.0.name.to_ascii_lowercase())
    });

    Ok(discovered)
}

fn read_selected_theme_id(app: &AppHandle) -> Result<Option<String>> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let store = app
        .store(APP_CONFIG.store_file_name)
        .map_err(|e| LauncherThemeError::StoreUnavailable(e.to_string()))?;

    let Some(value) = store.get(cfg.selected_theme_key) else {
        return Ok(None);
    };

    let selected = value
        .as_str()
        .and_then(|raw| normalize_theme_id(raw))
        .filter(|raw| !raw.is_empty());

    let Some(selected_id) = selected else {
        return Ok(None);
    };

    let theme_exists = discover_themes_with_paths(app)?
        .into_iter()
        .any(|(summary, _)| summary.id == selected_id);

    if theme_exists {
        Ok(Some(selected_id))
    } else {
        log::warn!("ignoring unavailable launcher theme '{selected_id}'");
        Ok(None)
    }
}

#[tauri::command]
pub fn list_launcher_themes(
    app: AppHandle,
) -> std::result::Result<Vec<LauncherThemeSummary>, String> {
    let themes = discover_themes_with_paths(&app)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|(summary, _)| summary)
        .collect();
    Ok(themes)
}

#[tauri::command]
pub fn get_selected_launcher_theme(app: AppHandle) -> std::result::Result<Option<String>, String> {
    read_selected_theme_id(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_selected_launcher_theme(
    app: AppHandle,
    theme_id: Option<String>,
) -> std::result::Result<(), String> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let normalized = match theme_id {
        Some(raw) => {
            Some(normalize_theme_id(&raw).ok_or_else(|| format!("invalid theme id '{raw}'"))?)
        }
        None => None,
    };

    if let Some(ref target_id) = normalized {
        let discovered = discover_themes_with_paths(&app).map_err(|e| e.to_string())?;
        let exists = discovered
            .iter()
            .any(|(summary, _)| summary.id.eq_ignore_ascii_case(target_id));
        if !exists {
            return Err(format!("theme '{target_id}' is not available"));
        }
    }

    let store = app
        .store(APP_CONFIG.store_file_name)
        .map_err(|e| LauncherThemeError::StoreUnavailable(e.to_string()).to_string())?;

    store.set(cfg.selected_theme_key, normalized.unwrap_or_default());
    store
        .save()
        .map_err(|e| LauncherThemeError::StoreSave(e.to_string()).to_string())
}

#[tauri::command]
pub fn get_launcher_theme_css(
    app: AppHandle,
    theme_id: String,
) -> std::result::Result<String, String> {
    let cfg = LAUNCHER_THEME_CONFIG;
    let normalized =
        normalize_theme_id(&theme_id).ok_or_else(|| format!("invalid theme id '{theme_id}'"))?;

    let discovered = discover_themes_with_paths(&app).map_err(|e| e.to_string())?;
    let (_, theme_dir) = discovered
        .into_iter()
        .find(|(summary, _)| summary.id == normalized)
        .ok_or_else(|| format!("theme '{normalized}' is not available"))?;

    let stylesheet_path = theme_dir.join(cfg.stylesheet_file_name);
    let metadata = fs::metadata(&stylesheet_path)
        .map_err(|e| LauncherThemeError::StylesheetMetadata(e.to_string()).to_string())?;
    if metadata.len() as usize > cfg.max_css_bytes {
        return Err(format!(
            "theme stylesheet '{}' exceeds {} bytes",
            stylesheet_path.display(),
            cfg.max_css_bytes
        ));
    }

    fs::read_to_string(&stylesheet_path)
        .map_err(|e| LauncherThemeError::StylesheetRead(e.to_string()).to_string())
}
