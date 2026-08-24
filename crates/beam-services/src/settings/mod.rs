// PORT: apps/desktop/src-tauri/src/settings/mod.rs
// Command attributes deleted; AppHandle became &BeamContext; the store is
// the shared JsonStore. Decision D5 removes the theming surface: the
// UiStylePreference type and the get/set_ui_style and get/set_base_color
// commands are deleted, not ported. set_icon_theme's applications-cache
// invalidation lands with the applications module (lane A1).

pub(crate) mod config;
pub mod error;

use std::collections::HashSet;

use beam_core::BeamContext;
use fontdb::Database;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use self::config::CONFIG as SETTINGS_CONFIG;
use self::error::{Result, SettingsError};

const AUTO_ICON_THEME_ID: &str = "auto";
const DEFAULT_FONT_FAMILY_ID: &str = "default";
const SYSTEM_FONT_FAMILY_ID: &str = "system";
const MIN_LAUNCHER_FONT_SIZE: f64 = 10.0;
const MAX_LAUNCHER_FONT_SIZE: f64 = 18.0;

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

fn normalize_icon_theme_id(value: &str) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
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

#[cfg(target_os = "linux")]
fn expand_home(path: &str) -> std::path::PathBuf {
    use std::path::PathBuf;

    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

#[cfg(target_os = "linux")]
fn resolve_icon_theme_name(index_theme_path: &std::path::Path, fallback: &str) -> Option<String> {
    let Ok(contents) = std::fs::read_to_string(index_theme_path) else {
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

#[cfg(target_os = "linux")]
fn list_icon_theme_summaries_internal() -> Vec<IconThemeSummary> {
    let mut seen = HashSet::new();
    let mut themes = Vec::new();

    // TODO(PORT: apps/desktop/src-tauri/src/applications/config.rs): the
    // icon directory list comes with the applications module (lane A1);
    // the freedesktop defaults below are the same directories it lists.
    let icon_directories = ["~/.local/share/icons", "/usr/share/icons", "~/.icons"];

    for base_dir in icon_directories {
        let resolved_base_dir = expand_home(base_dir);
        let Ok(entries) = std::fs::read_dir(resolved_base_dir) else {
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

/// Icon theming is handled natively on macOS (per-app bundle icons), so a
/// single synthetic entry keeps the settings surface functional.
#[cfg(not(target_os = "linux"))]
fn list_icon_theme_summaries_internal() -> Vec<IconThemeSummary> {
    vec![IconThemeSummary {
        id: "system".to_string(),
        name: "System icons".to_string(),
    }]
}

pub fn get_selected_icon_theme(cx: &BeamContext) -> Result<Option<String>> {
    let store = cx.settings();
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

pub fn get_ui_layout_mode(cx: &BeamContext) -> Result<UiLayoutMode> {
    let store = cx.settings();
    Ok(parse_ui_layout_mode(
        store.get(SETTINGS_CONFIG.ui_layout_mode_key),
    ))
}

pub fn set_ui_layout_mode(cx: &BeamContext, mode: UiLayoutMode) -> Result<()> {
    let store = cx.settings();
    store.set(
        SETTINGS_CONFIG.ui_layout_mode_key,
        &serialize_ui_layout_mode(mode),
    )?;
    Ok(())
}

pub fn get_launcher_opacity(cx: &BeamContext) -> Result<f64> {
    let store = cx.settings();
    Ok(parse_launcher_opacity(
        store.get(SETTINGS_CONFIG.launcher_opacity_key),
    ))
}

/// The "Glass strength" setting (SD-4): same store key, clamped 0.25–0.95
/// on write. The 0.0–1.0 clamp of the React build narrows here because the
/// value now scales the plate alpha directly.
pub fn set_launcher_opacity(cx: &BeamContext, opacity: f64) -> Result<f64> {
    let normalized = normalize_launcher_opacity(Some(opacity))
        .map(|value| value.clamp(0.25, 0.95))
        .ok_or(SettingsError::InvalidLauncherOpacity)?;
    let store = cx.settings();
    store.set(SETTINGS_CONFIG.launcher_opacity_key, &normalized)?;
    Ok(normalized)
}

pub fn list_font_families() -> Vec<FontFamilySummary> {
    list_font_family_summaries_internal()
}

pub fn get_launcher_font_family(cx: &BeamContext) -> Result<String> {
    let store = cx.settings();
    let selected = parse_launcher_font_family(store.get(SETTINGS_CONFIG.launcher_font_family_key));
    if is_builtin_font_family_id(&selected) || is_available_font_family(&selected) {
        Ok(selected)
    } else {
        Ok(SETTINGS_CONFIG.default_launcher_font_family.to_string())
    }
}

pub fn set_launcher_font_family(cx: &BeamContext, family: String) -> Result<String> {
    let normalized = normalize_launcher_font_family_id(&family)
        .ok_or(SettingsError::InvalidLauncherFontFamily)?;
    if !is_builtin_font_family_id(&normalized) && !is_available_font_family(&normalized) {
        return Err(SettingsError::InvalidLauncherFontFamily);
    }
    let store = cx.settings();
    store.set(SETTINGS_CONFIG.launcher_font_family_key, &normalized)?;
    Ok(normalized)
}

pub fn get_launcher_font_size(cx: &BeamContext) -> Result<f64> {
    let store = cx.settings();
    Ok(parse_launcher_font_size(
        store.get(SETTINGS_CONFIG.launcher_font_size_key),
    ))
}

pub fn set_launcher_font_size(cx: &BeamContext, size: f64) -> Result<f64> {
    let normalized =
        normalize_launcher_font_size(Some(size)).ok_or(SettingsError::InvalidLauncherFontSize)?;
    let store = cx.settings();
    store.set(SETTINGS_CONFIG.launcher_font_size_key, &normalized)?;
    Ok(normalized)
}

pub fn get_trigger_symbols(cx: &BeamContext) -> Result<TriggerSymbols> {
    let store = cx.settings();
    Ok(parse_trigger_symbols(
        store.get(SETTINGS_CONFIG.trigger_symbols_key),
    ))
}

pub fn set_trigger_symbols(cx: &BeamContext, symbols: TriggerSymbols) -> Result<TriggerSymbols> {
    let normalized =
        validate_trigger_symbols(symbols).ok_or(SettingsError::InvalidTriggerSymbols)?;
    let store = cx.settings();
    store.set(
        SETTINGS_CONFIG.trigger_symbols_key,
        &serde_json::json!(normalized),
    )?;
    Ok(normalized)
}

pub fn list_icon_themes() -> Vec<IconThemeSummary> {
    list_icon_theme_summaries_internal()
}

pub fn get_icon_theme(cx: &BeamContext) -> Result<String> {
    let selected = get_selected_icon_theme(cx)?;
    Ok(selected.unwrap_or_else(|| AUTO_ICON_THEME_ID.to_string()))
}

pub fn set_icon_theme(cx: &BeamContext, theme_id: String) -> Result<String> {
    let normalized = normalize_icon_theme_id(&theme_id).ok_or(SettingsError::InvalidIconTheme)?;
    let target = if normalized.eq_ignore_ascii_case(AUTO_ICON_THEME_ID) {
        AUTO_ICON_THEME_ID.to_string()
    } else if is_available_icon_theme(&normalized) {
        normalized
    } else {
        return Err(SettingsError::InvalidIconTheme);
    };

    let store = cx.settings();
    store.set(SETTINGS_CONFIG.icon_theme_key, &target)?;
    // TODO(PORT: applications::cache::invalidate_applications_cache): the
    // icon cache flush lands with the applications module (lane A1).
    log::debug!("icon theme changed; applications cache refresh pending lane A1");
    Ok(target)
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

#[cfg(test)]
mod tests {
    use super::*;
    use beam_core::{BeamPaths, HostPlatform};

    fn test_context(name: &str) -> BeamContext {
        let dir = std::env::temp_dir().join(format!("beam-settings-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        let paths = BeamPaths::from_platform(
            HostPlatform::Linux,
            Some(dir.into_os_string()),
            None,
            None,
            None,
            None,
        )
        .unwrap();
        BeamContext::with_paths(paths).unwrap()
    }

    #[test]
    fn layout_mode_round_trips() {
        let cx = test_context("layout");
        assert_eq!(get_ui_layout_mode(&cx).unwrap(), UiLayoutMode::Expanded);
        set_ui_layout_mode(&cx, UiLayoutMode::Compressed).unwrap();
        assert_eq!(get_ui_layout_mode(&cx).unwrap(), UiLayoutMode::Compressed);
    }

    #[test]
    fn opacity_clamps_to_the_glass_strength_range() {
        let cx = test_context("opacity");
        // The stored default is 0.96 (settings.json default); reads keep the
        // historical 0..1 normalisation.
        assert!((get_launcher_opacity(&cx).unwrap() - 0.96).abs() < 1e-9);

        // Writes clamp into the SD-4 slider range.
        assert_eq!(set_launcher_opacity(&cx, 1.5).unwrap(), 0.95);
        assert_eq!(set_launcher_opacity(&cx, 0.1).unwrap(), 0.25);
        assert!((get_launcher_opacity(&cx).unwrap() - 0.25).abs() < 1e-9);
        assert!(set_launcher_opacity(&cx, f64::NAN).is_err());
    }

    #[test]
    fn trigger_symbols_validate_and_persist() {
        let cx = test_context("triggers");

        let symbols = get_trigger_symbols(&cx).unwrap();
        assert_eq!(symbols.quicklink, "!");
        assert_eq!(symbols.system, "$");

        let updated = TriggerSymbols {
            quicklink: "@".into(),
            ..symbols
        };
        let saved = set_trigger_symbols(&cx, updated).unwrap();
        assert_eq!(saved.quicklink, "@");
        assert_eq!(get_trigger_symbols(&cx).unwrap().quicklink, "@");

        // Duplicate symbols are rejected (system collides with quicklink).
        let current = get_trigger_symbols(&cx).unwrap();
        let duplicate = TriggerSymbols {
            system: current.quicklink.clone(),
            ..current
        };
        assert!(set_trigger_symbols(&cx, duplicate).is_err());

        // Multi-character symbols are rejected.
        let long = TriggerSymbols {
            quicklink: "!!".into(),
            ..get_trigger_symbols(&cx).unwrap()
        };
        assert!(set_trigger_symbols(&cx, long).is_err());
    }

    #[test]
    fn font_sizes_snap_to_halves_and_clamp() {
        let cx = test_context("font-size");
        assert!((get_launcher_font_size(&cx).unwrap() - 13.0).abs() < 1e-9);
        assert_eq!(set_launcher_font_size(&cx, 14.3).unwrap(), 14.5);
        assert_eq!(set_launcher_font_size(&cx, 99.0).unwrap(), 18.0);
        assert_eq!(set_launcher_font_size(&cx, 1.0).unwrap(), 10.0);
        assert!(set_launcher_font_size(&cx, f64::NAN).is_err());
    }

    #[test]
    fn font_family_rejects_unknown_families() {
        let cx = test_context("font-family");
        assert_eq!(
            get_launcher_font_family(&cx).unwrap(),
            SETTINGS_CONFIG.default_launcher_font_family
        );
        assert!(set_launcher_font_family(&cx, "definitely-not-a-font".into()).is_err());
        // Builtins always work.
        assert_eq!(
            set_launcher_font_family(&cx, "default".into()).unwrap(),
            "default"
        );
        assert_eq!(
            set_launcher_font_family(&cx, "system".into()).unwrap(),
            "system"
        );
    }
}
