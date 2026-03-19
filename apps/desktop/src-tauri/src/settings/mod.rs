pub(crate) mod config;
pub mod error;

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use self::config::CONFIG as SETTINGS_CONFIG;
use self::error::{Result, SettingsError};
use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;

const AUTO_ICON_THEME_ID: &str = "auto";

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UiLayoutMode {
    #[default]
    Expanded,
    Compressed,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IconThemeSummary {
    pub id: String,
    pub name: String,
}

fn open_store(app: &AppHandle) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>> {
    app.store(APP_CONFIG.store_file_name)
        .map_err(|err| SettingsError::StoreOpen(err.to_string()))
}

fn save_store(store: &tauri_plugin_store::Store<tauri::Wry>) -> Result<()> {
    store
        .save()
        .map_err(|err| SettingsError::StoreSave(err.to_string()))
}

fn normalize_icon_theme_id(value: &str) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
}

fn parse_launcher_opacity(value: Option<serde_json::Value>) -> f64 {
    let stored = value.and_then(|raw| match raw {
        serde_json::Value::Number(number) => number.as_f64(),
        serde_json::Value::String(text) => text.trim().parse::<f64>().ok(),
        _ => None,
    });

    normalize_launcher_opacity(stored).unwrap_or(SETTINGS_CONFIG.default_launcher_opacity)
}

fn normalize_launcher_opacity(value: Option<f64>) -> Option<f64> {
    value
        .filter(|opacity| opacity.is_finite())
        .map(|opacity| opacity.clamp(0.0, 1.0))
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

fn resolve_icon_theme_name(index_theme_path: &Path, fallback: &str) -> Option<String> {
    let Ok(contents) = fs::read_to_string(index_theme_path) else {
        return Some(fallback.to_string());
    };

    let mut in_icon_theme_section = false;
    let mut hidden = false;
    let mut name: Option<String> = None;

    for raw_line in contents.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }

        if line.starts_with('[') && line.ends_with(']') {
            in_icon_theme_section = line.eq_ignore_ascii_case("[Icon Theme]");
            continue;
        }

        if !in_icon_theme_section {
            continue;
        }

        if let Some(value) = line.strip_prefix("Hidden=") {
            hidden = value.trim().eq_ignore_ascii_case("true");
            continue;
        }

        if let Some(value) = line.strip_prefix("Name=") {
            let normalized = value.trim();
            if !normalized.is_empty() {
                name = Some(normalized.to_string());
            }
        }
    }

    if hidden {
        return None;
    }

    Some(name.unwrap_or_else(|| fallback.to_string()))
}

fn list_icon_theme_summaries_internal() -> Vec<IconThemeSummary> {
    let mut seen = HashSet::new();
    let mut themes = Vec::new();

    for base_dir in APPLICATIONS_CONFIG.icon_directories {
        let resolved_base_dir = expand_home(base_dir);
        let Ok(entries) = fs::read_dir(resolved_base_dir) else {
            continue;
        };

        for entry in entries.flatten() {
            let theme_dir = entry.path();
            if !theme_dir.is_dir() {
                continue;
            }

            let Some(dir_name) = theme_dir.file_name().and_then(|value| value.to_str()) else {
                continue;
            };

            if !seen.insert(dir_name.to_string()) {
                continue;
            }

            let index_theme_path = theme_dir.join("index.theme");
            if !index_theme_path.is_file() {
                continue;
            }

            let Some(name) = resolve_icon_theme_name(&index_theme_path, dir_name) else {
                continue;
            };

            themes.push(IconThemeSummary {
                id: dir_name.to_string(),
                name,
            });
        }
    }

    themes.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    themes
}

pub fn get_selected_icon_theme(app: &AppHandle) -> Result<Option<String>> {
    let store = open_store(app)?;
    Ok(store
        .get(SETTINGS_CONFIG.icon_theme_key)
        .and_then(|value| value.as_str().map(str::to_string))
        .and_then(|value| normalize_icon_theme_id(&value))
        .filter(|value| !value.eq_ignore_ascii_case(AUTO_ICON_THEME_ID)))
}

fn is_available_icon_theme(theme_id: &str) -> bool {
    list_icon_theme_summaries_internal()
        .iter()
        .any(|theme| theme.id == theme_id)
}

fn invalidate_applications_cache(app: &AppHandle) -> Result<()> {
    let store = open_store(app)?;
    store.delete(APPLICATIONS_CONFIG.cache_key);
    store.delete(APPLICATIONS_CONFIG.last_updated_timestamp_key);
    save_store(&store)?;
    let _ = app.emit(APPLICATIONS_CONFIG.cache_updated_event, ());
    Ok(())
}

fn parse_ui_layout_mode(value: Option<serde_json::Value>) -> UiLayoutMode {
    value
        .and_then(|stored| stored.as_str().map(str::to_string))
        .and_then(|stored| match stored.as_str() {
            "expanded" => Some(UiLayoutMode::Expanded),
            "compressed" => Some(UiLayoutMode::Compressed),
            _ => None,
        })
        .unwrap_or_default()
}

fn serialize_ui_layout_mode(mode: UiLayoutMode) -> &'static str {
    match mode {
        UiLayoutMode::Expanded => "expanded",
        UiLayoutMode::Compressed => "compressed",
    }
}

#[tauri::command]
pub fn get_ui_layout_mode(app: AppHandle) -> Result<UiLayoutMode> {
    let store = open_store(&app)?;
    Ok(parse_ui_layout_mode(
        store.get(SETTINGS_CONFIG.ui_layout_mode_key),
    ))
}

#[tauri::command]
pub fn set_ui_layout_mode(app: AppHandle, mode: UiLayoutMode) -> Result<()> {
    let store = open_store(&app)?;
    store.set(
        SETTINGS_CONFIG.ui_layout_mode_key,
        serialize_ui_layout_mode(mode),
    );
    save_store(&store)
}

#[tauri::command]
pub fn get_launcher_opacity(app: AppHandle) -> Result<f64> {
    let store = open_store(&app)?;
    Ok(parse_launcher_opacity(
        store.get(SETTINGS_CONFIG.launcher_opacity_key),
    ))
}

#[tauri::command]
pub fn set_launcher_opacity(app: AppHandle, opacity: f64) -> Result<f64> {
    let normalized =
        normalize_launcher_opacity(Some(opacity)).ok_or(SettingsError::InvalidLauncherOpacity)?;
    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.launcher_opacity_key, normalized);
    save_store(&store)?;
    Ok(normalized)
}

#[tauri::command]
pub fn list_icon_themes() -> Vec<IconThemeSummary> {
    list_icon_theme_summaries_internal()
}

#[tauri::command]
pub fn get_icon_theme(app: AppHandle) -> Result<String> {
    let selected = get_selected_icon_theme(&app)?;
    Ok(selected.unwrap_or_else(|| AUTO_ICON_THEME_ID.to_string()))
}

#[tauri::command]
pub fn set_icon_theme(app: AppHandle, theme_id: String) -> Result<String> {
    let normalized = normalize_icon_theme_id(&theme_id).ok_or(SettingsError::InvalidIconTheme)?;
    let target = if normalized.eq_ignore_ascii_case(AUTO_ICON_THEME_ID) {
        AUTO_ICON_THEME_ID.to_string()
    } else if is_available_icon_theme(&normalized) {
        normalized
    } else {
        return Err(SettingsError::InvalidIconTheme);
    };

    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.icon_theme_key, target.clone());
    save_store(&store)?;
    invalidate_applications_cache(&app)?;
    Ok(target)
}
