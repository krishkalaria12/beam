pub(crate) mod config;
pub mod error;

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use fontdb::Database;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use self::config::CONFIG as SETTINGS_CONFIG;
use self::error::{Result, SettingsError};
use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;

const AUTO_ICON_THEME_ID: &str = "auto";
const DEFAULT_FONT_FAMILY_ID: &str = "default";
const SYSTEM_FONT_FAMILY_ID: &str = "system";
const MIN_LAUNCHER_FONT_SIZE: f64 = 10.0;
const MAX_LAUNCHER_FONT_SIZE: f64 = 18.0;
#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UiStylePreference {
    Default,
    Glassy,
    #[default]
    Solid,
}

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

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FontFamilySummary {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CustomTriggerBinding {
    pub symbol: String,
    pub command_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TriggerSymbols {
    pub quicklink: String,
    pub system: String,
    pub script: String,
    pub shell: String,
    pub custom_bindings: Vec<CustomTriggerBinding>,
}

fn default_trigger_symbols() -> TriggerSymbols {
    TriggerSymbols {
        quicklink: "!".to_string(),
        system: "$".to_string(),
        script: ">".to_string(),
        shell: "~".to_string(),
        custom_bindings: Vec::new(),
    }
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

fn normalize_ui_style(value: &str) -> Option<UiStylePreference> {
    match value.trim().to_ascii_lowercase().as_str() {
        "default" => Some(UiStylePreference::Default),
        "glassy" => Some(UiStylePreference::Glassy),
        "solid" => Some(UiStylePreference::Solid),
        _ => None,
    }
}

fn serialize_ui_style(style: UiStylePreference) -> &'static str {
    match style {
        UiStylePreference::Default => "default",
        UiStylePreference::Glassy => "glassy",
        UiStylePreference::Solid => "solid",
    }
}

fn parse_ui_style(value: Option<Value>) -> UiStylePreference {
    value
        .and_then(|stored| stored.as_str().and_then(normalize_ui_style))
        .unwrap_or_default()
}

fn normalize_base_color(value: &str) -> Option<String> {
    let normalized = value.trim();
    let hex = normalized.strip_prefix('#')?;

    if hex.len() == 3 && hex.chars().all(|ch| ch.is_ascii_hexdigit()) {
        let mut expanded = String::with_capacity(7);
        expanded.push('#');
        for ch in hex.chars() {
            expanded.push(ch.to_ascii_lowercase());
            expanded.push(ch.to_ascii_lowercase());
        }
        return Some(expanded);
    }

    if hex.len() == 6 && hex.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Some(format!("#{}", hex.to_ascii_lowercase()));
    }

    None
}

fn parse_base_color(value: Option<Value>) -> String {
    value
        .and_then(|stored| stored.as_str().and_then(normalize_base_color))
        .unwrap_or_else(|| SETTINGS_CONFIG.default_base_color.to_string())
}

fn is_valid_trigger_symbol(value: &str) -> bool {
    value.chars().count() == 1 && !value.chars().any(char::is_whitespace)
}

fn normalize_trigger_symbol(value: &str) -> Option<String> {
    let normalized = value.trim();
    if is_valid_trigger_symbol(normalized) {
        Some(normalized.to_string())
    } else {
        None
    }
}

fn normalize_command_id(value: &str) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

fn normalize_custom_trigger_bindings(value: &Value) -> Vec<CustomTriggerBinding> {
    let Value::Array(items) = value else {
        return Vec::new();
    };

    let mut seen_symbols = HashSet::new();
    let mut bindings = Vec::new();

    for item in items {
        let Value::Object(record) = item else {
            continue;
        };

        let Some(symbol) = record
            .get("symbol")
            .and_then(Value::as_str)
            .and_then(normalize_trigger_symbol)
        else {
            continue;
        };
        let Some(command_id) = record
            .get("commandId")
            .or_else(|| record.get("command_id"))
            .and_then(Value::as_str)
            .and_then(normalize_command_id)
        else {
            continue;
        };

        if seen_symbols.insert(symbol.clone()) {
            bindings.push(CustomTriggerBinding { symbol, command_id });
        }
    }

    bindings
}

fn has_unique_trigger_symbols(symbols: &TriggerSymbols) -> bool {
    let mut used = HashSet::new();
    for symbol in [
        symbols.quicklink.as_str(),
        symbols.system.as_str(),
        symbols.script.as_str(),
        symbols.shell.as_str(),
    ] {
        if !used.insert(symbol.to_string()) {
            return false;
        }
    }

    for binding in &symbols.custom_bindings {
        if !used.insert(binding.symbol.clone()) {
            return false;
        }
    }

    true
}

fn trigger_symbols_from_map(record: &Map<String, Value>) -> Option<TriggerSymbols> {
    let defaults = default_trigger_symbols();
    let quicklink = record
        .get("quicklink")
        .and_then(Value::as_str)
        .and_then(normalize_trigger_symbol)
        .unwrap_or_else(|| defaults.quicklink.clone());
    let system = record
        .get("system")
        .and_then(Value::as_str)
        .and_then(normalize_trigger_symbol)
        .unwrap_or_else(|| defaults.system.clone());
    let script = record
        .get("script")
        .and_then(Value::as_str)
        .and_then(normalize_trigger_symbol)
        .unwrap_or_else(|| defaults.script.clone());
    let shell = record
        .get("shell")
        .and_then(Value::as_str)
        .and_then(normalize_trigger_symbol)
        .unwrap_or_else(|| defaults.shell.clone());
    let custom_bindings = record
        .get("customBindings")
        .or_else(|| record.get("custom_bindings"))
        .map(normalize_custom_trigger_bindings)
        .unwrap_or_default();

    let normalized = TriggerSymbols {
        quicklink,
        system,
        script,
        shell,
        custom_bindings,
    };

    if has_unique_trigger_symbols(&normalized) {
        Some(normalized)
    } else {
        None
    }
}

fn parse_trigger_symbols(value: Option<Value>) -> TriggerSymbols {
    value
        .and_then(|stored| match stored {
            Value::Object(record) => trigger_symbols_from_map(&record),
            _ => None,
        })
        .unwrap_or_else(default_trigger_symbols)
}

fn validate_trigger_symbols(symbols: TriggerSymbols) -> Option<TriggerSymbols> {
    let quicklink = normalize_trigger_symbol(&symbols.quicklink)?;
    let system = normalize_trigger_symbol(&symbols.system)?;
    let script = normalize_trigger_symbol(&symbols.script)?;
    let shell = normalize_trigger_symbol(&symbols.shell)?;

    let mut seen_symbols = HashSet::new();
    let mut custom_bindings = Vec::new();
    for binding in symbols.custom_bindings {
        let symbol = normalize_trigger_symbol(&binding.symbol)?;
        let command_id = normalize_command_id(&binding.command_id)?;
        if seen_symbols.insert(symbol.clone()) {
            custom_bindings.push(CustomTriggerBinding { symbol, command_id });
        }
    }

    let normalized = TriggerSymbols {
        quicklink,
        system,
        script,
        shell,
        custom_bindings,
    };

    if has_unique_trigger_symbols(&normalized) {
        Some(normalized)
    } else {
        None
    }
}

fn normalize_launcher_font_family_id(value: &str) -> Option<String> {
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

fn parse_launcher_font_family(value: Option<serde_json::Value>) -> String {
    value
        .and_then(|raw| raw.as_str().map(str::to_string))
        .and_then(|raw| normalize_launcher_font_family_id(&raw))
        .unwrap_or_else(|| SETTINGS_CONFIG.default_launcher_font_family.to_string())
}

fn is_builtin_font_family_id(value: &str) -> bool {
    value.eq_ignore_ascii_case(DEFAULT_FONT_FAMILY_ID)
        || value.eq_ignore_ascii_case(SYSTEM_FONT_FAMILY_ID)
}

fn parse_launcher_font_size(value: Option<serde_json::Value>) -> f64 {
    let stored = value.and_then(|raw| match raw {
        serde_json::Value::Number(number) => number.as_f64(),
        serde_json::Value::String(text) => text.trim().parse::<f64>().ok(),
        _ => None,
    });

    normalize_launcher_font_size(stored).unwrap_or(SETTINGS_CONFIG.default_launcher_font_size)
}

fn normalize_launcher_font_size(value: Option<f64>) -> Option<f64> {
    value
        .filter(|size| size.is_finite())
        .map(|size| (size * 2.0).round() / 2.0)
        .map(|size| size.clamp(MIN_LAUNCHER_FONT_SIZE, MAX_LAUNCHER_FONT_SIZE))
}

fn list_font_family_summaries_internal() -> Vec<FontFamilySummary> {
    let mut db = Database::new();
    db.load_system_fonts();

    let mut seen = HashSet::new();
    let mut fonts = Vec::new();

    for face in db.faces() {
        for (family_name, _) in &face.families {
            let normalized = family_name.trim();
            if normalized.is_empty() {
                continue;
            }

            let dedupe_key = normalized.to_lowercase();
            if !seen.insert(dedupe_key) {
                continue;
            }

            fonts.push(FontFamilySummary {
                id: normalized.to_string(),
                name: normalized.to_string(),
            });
        }
    }

    fonts.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    fonts
}

fn is_available_font_family(family_id: &str) -> bool {
    list_font_family_summaries_internal()
        .iter()
        .any(|family| family.id == family_id)
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
pub fn get_ui_style(app: AppHandle) -> Result<UiStylePreference> {
    let store = open_store(&app)?;
    Ok(parse_ui_style(store.get(SETTINGS_CONFIG.ui_style_key)))
}

#[tauri::command]
pub fn set_ui_style(app: AppHandle, style: UiStylePreference) -> Result<UiStylePreference> {
    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.ui_style_key, serialize_ui_style(style));
    save_store(&store)?;
    Ok(style)
}

#[tauri::command]
pub fn get_base_color(app: AppHandle) -> Result<String> {
    let store = open_store(&app)?;
    Ok(parse_base_color(store.get(SETTINGS_CONFIG.base_color_key)))
}

#[tauri::command]
pub fn set_base_color(app: AppHandle, color: String) -> Result<String> {
    let normalized = normalize_base_color(&color).ok_or(SettingsError::InvalidBaseColor)?;
    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.base_color_key, normalized.clone());
    save_store(&store)?;
    Ok(normalized)
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
pub fn list_font_families() -> Vec<FontFamilySummary> {
    list_font_family_summaries_internal()
}

#[tauri::command]
pub fn get_launcher_font_family(app: AppHandle) -> Result<String> {
    let store = open_store(&app)?;
    let selected = parse_launcher_font_family(store.get(SETTINGS_CONFIG.launcher_font_family_key));
    if is_builtin_font_family_id(&selected) || is_available_font_family(&selected) {
        Ok(selected)
    } else {
        Ok(SETTINGS_CONFIG.default_launcher_font_family.to_string())
    }
}

#[tauri::command]
pub fn set_launcher_font_family(app: AppHandle, family: String) -> Result<String> {
    let normalized = normalize_launcher_font_family_id(&family)
        .ok_or(SettingsError::InvalidLauncherFontFamily)?;
    if !is_builtin_font_family_id(&normalized) && !is_available_font_family(&normalized) {
        return Err(SettingsError::InvalidLauncherFontFamily);
    }
    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.launcher_font_family_key, normalized.clone());
    save_store(&store)?;
    Ok(normalized)
}

#[tauri::command]
pub fn get_launcher_font_size(app: AppHandle) -> Result<f64> {
    let store = open_store(&app)?;
    Ok(parse_launcher_font_size(
        store.get(SETTINGS_CONFIG.launcher_font_size_key),
    ))
}

#[tauri::command]
pub fn set_launcher_font_size(app: AppHandle, size: f64) -> Result<f64> {
    let normalized =
        normalize_launcher_font_size(Some(size)).ok_or(SettingsError::InvalidLauncherFontSize)?;
    let store = open_store(&app)?;
    store.set(SETTINGS_CONFIG.launcher_font_size_key, normalized);
    save_store(&store)?;
    Ok(normalized)
}

#[tauri::command]
pub fn get_trigger_symbols(app: AppHandle) -> Result<TriggerSymbols> {
    let store = open_store(&app)?;
    Ok(parse_trigger_symbols(
        store.get(SETTINGS_CONFIG.trigger_symbols_key),
    ))
}

#[tauri::command]
pub fn set_trigger_symbols(app: AppHandle, symbols: TriggerSymbols) -> Result<TriggerSymbols> {
    let normalized =
        validate_trigger_symbols(symbols).ok_or(SettingsError::InvalidTriggerSymbols)?;
    let store = open_store(&app)?;
    store.set(
        SETTINGS_CONFIG.trigger_symbols_key,
        serde_json::json!(normalized),
    );
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
