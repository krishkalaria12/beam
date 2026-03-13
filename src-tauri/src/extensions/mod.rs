pub mod browser_extension;
pub(crate) mod config;
pub mod error;
pub mod oauth;
pub mod runtime;
pub mod store;

use std::fs;
use std::io::{self, Cursor, Read};
use std::path::{Path, PathBuf};

use bytes::Bytes;
use error::{ExtensionsError, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use tauri::Manager;
use zip::result::ZipError;
use zip::ZipArchive;

use crate::extensions::config::CONFIG as EXTENSIONS_CONFIG;
use crate::extensions::runtime::proto;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HeuristicViolation {
    command_name: String,
    reason: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "status")]
pub enum InstallResult {
    Success,
    RequiresConfirmation { violations: Vec<HeuristicViolation> },
}

trait IncompatibilityHeuristic {
    fn check(&self, command_title: &str, file_content: &str) -> Option<HeuristicViolation>;
}

struct AppleScriptHeuristic;
impl IncompatibilityHeuristic for AppleScriptHeuristic {
    fn check(&self, command_title: &str, file_content: &str) -> Option<HeuristicViolation> {
        if file_content.contains(EXTENSIONS_CONFIG.heuristic_applescript_symbol) {
            Some(HeuristicViolation {
                command_name: command_title.to_string(),
                reason: format!(
                    "Possible usage of AppleScript ({})",
                    EXTENSIONS_CONFIG.heuristic_applescript_symbol
                ),
            })
        } else {
            None
        }
    }
}

struct MacOSPathHeuristic;
impl IncompatibilityHeuristic for MacOSPathHeuristic {
    fn check(&self, command_title: &str, file_content: &str) -> Option<HeuristicViolation> {
        for path in EXTENSIONS_CONFIG.heuristic_macos_paths {
            if file_content.contains(path) {
                return Some(HeuristicViolation {
                    command_name: command_title.to_string(),
                    reason: format!("Potential hardcoded macOS path: '{path}'"),
                });
            }
        }

        None
    }
}

fn get_extension_dir(app: &tauri::AppHandle, slug: &str) -> Result<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| ExtensionsError::AppDataDirUnavailable)?;

    Ok(data_dir
        .join(EXTENSIONS_CONFIG.plugins_directory)
        .join(slug))
}

fn is_valid_extension_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
}

fn has_uri_scheme(value: &str) -> bool {
    let mut chars = value.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !first.is_ascii_alphabetic() {
        return false;
    }

    let mut saw_colon = false;
    for character in chars {
        if character == ':' {
            saw_colon = true;
            break;
        }
        if !(character.is_ascii_alphanumeric()
            || character == '+'
            || character == '-'
            || character == '.')
        {
            return false;
        }
    }

    saw_colon
}

fn normalized_icon_relative_path(icon: &str) -> Option<&str> {
    let trimmed = icon.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_dot_prefix = trimmed
        .strip_prefix("./")
        .or_else(|| trimmed.strip_prefix(".\\"))
        .unwrap_or(trimmed);
    let without_slash_prefix = without_dot_prefix
        .strip_prefix('/')
        .or_else(|| without_dot_prefix.strip_prefix('\\'))
        .unwrap_or(without_dot_prefix);

    if without_slash_prefix.is_empty() {
        None
    } else {
        Some(without_slash_prefix)
    }
}

fn push_candidate_with_common_extensions(candidates: &mut Vec<PathBuf>, path: PathBuf) {
    candidates.push(path.clone());
    if path.extension().is_some() {
        return;
    }

    for extension in ["png", "svg", "jpg", "jpeg", "webp", "ico"] {
        candidates.push(path.with_extension(extension));
    }
}

fn resolve_plugin_icon_reference(plugin_dir: &Path, icon: Option<&str>) -> Option<String> {
    let raw_icon = icon?.trim();
    if raw_icon.is_empty() {
        return None;
    }

    if raw_icon.starts_with("http://")
        || raw_icon.starts_with("https://")
        || raw_icon.starts_with("asset:")
        || raw_icon.starts_with("tauri://")
        || raw_icon.starts_with("data:")
    {
        return Some(raw_icon.to_string());
    }

    if let Some(local_path) = raw_icon.strip_prefix("file://") {
        let absolute = PathBuf::from(local_path);
        return absolute
            .is_file()
            .then(|| absolute.to_string_lossy().into_owned());
    }

    if has_uri_scheme(raw_icon) {
        return Some(raw_icon.to_string());
    }

    let absolute = PathBuf::from(raw_icon);
    if absolute.is_absolute() {
        return absolute
            .is_file()
            .then(|| absolute.to_string_lossy().into_owned());
    }

    let relative = normalized_icon_relative_path(raw_icon)?;
    let mut candidates = Vec::new();
    let relative_path = PathBuf::from(relative);

    push_candidate_with_common_extensions(&mut candidates, plugin_dir.join(&relative_path));

    if relative_path.components().count() == 1 {
        for prefix in [
            "assets",
            "Assets",
            "icons",
            "Icons",
            "images",
            "img",
            "media",
            "dist/assets",
            "build/assets",
        ] {
            push_candidate_with_common_extensions(
                &mut candidates,
                plugin_dir.join(prefix).join(&relative_path),
            );
        }
    }

    candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .map(|candidate| candidate.to_string_lossy().into_owned())
}

async fn download_archive(url: &str) -> Result<Bytes> {
    let response = reqwest::get(url).await?;
    if !response.status().is_success() {
        return Err(ExtensionsError::Network(format!(
            "Failed to download extension: status code {}",
            response.status()
        )));
    }

    response.bytes().await.map_err(ExtensionsError::from)
}

fn find_common_prefix(file_names: &[PathBuf]) -> Option<PathBuf> {
    if file_names.len() <= 1 {
        return None;
    }

    file_names
        .first()
        .and_then(|path| path.components().next())
        .and_then(|first_component| {
            if file_names
                .iter()
                .all(|path| path.starts_with(first_component))
            {
                Some(PathBuf::from(first_component.as_os_str()))
            } else {
                None
            }
        })
}

fn get_commands_from_package_json(
    archive: &mut ZipArchive<Cursor<Bytes>>,
    prefix: &Option<PathBuf>,
) -> Result<Vec<(String, String)>> {
    let package_json_path = if let Some(path_prefix) = prefix {
        path_prefix.join(EXTENSIONS_CONFIG.package_json_file_name)
    } else {
        PathBuf::from(EXTENSIONS_CONFIG.package_json_file_name)
    };

    let mut package_file = match archive.by_name(&package_json_path.to_string_lossy()) {
        Ok(file) => file,
        Err(ZipError::FileNotFound) => return Ok(vec![]),
        Err(error) => return Err(error.into()),
    };

    let mut package_content = String::new();
    package_file.read_to_string(&mut package_content)?;

    let package_json: serde_json::Value = serde_json::from_str(&package_content)?;

    let commands = match package_json
        .get("commands")
        .and_then(|commands| commands.as_array())
    {
        Some(commands) => commands,
        None => return Ok(vec![]),
    };

    Ok(commands
        .iter()
        .filter_map(|command| {
            let command_name = command.get("name")?.as_str()?;
            let command_title = command
                .get("title")
                .and_then(|title| title.as_str())
                .unwrap_or(command_name)
                .to_string();

            let source_path = format!("{command_name}.js");
            let command_file_path = if let Some(path_prefix) = prefix {
                path_prefix.join(source_path)
            } else {
                PathBuf::from(source_path)
            };

            Some((
                command_file_path.to_string_lossy().into_owned(),
                command_title,
            ))
        })
        .collect())
}

fn run_heuristic_checks(archive_data: &Bytes) -> Result<Vec<HeuristicViolation>> {
    let heuristics: Vec<Box<dyn IncompatibilityHeuristic + Send + Sync>> =
        vec![Box::new(AppleScriptHeuristic), Box::new(MacOSPathHeuristic)];
    if heuristics.is_empty() {
        return Ok(vec![]);
    }

    let mut archive = ZipArchive::new(Cursor::new(archive_data.clone()))?;
    let file_names: Vec<PathBuf> = archive.file_names().map(PathBuf::from).collect();
    let prefix = find_common_prefix(&file_names);

    let commands_to_check = get_commands_from_package_json(&mut archive, &prefix)?;
    let mut violations = Vec::new();

    for (path_in_archive, command_title) in commands_to_check {
        if let Ok(mut command_file) = archive.by_name(&path_in_archive) {
            let mut content = String::new();
            if command_file.read_to_string(&mut content).is_ok() {
                for heuristic in &heuristics {
                    if let Some(violation) = heuristic.check(&command_title, &content) {
                        violations.push(violation);
                    }
                }
            }
        }
    }

    Ok(violations)
}

fn extract_archive(archive_data: &Bytes, target_dir: &Path) -> Result<()> {
    if target_dir.exists() {
        fs::remove_dir_all(target_dir)?;
    }
    fs::create_dir_all(target_dir)?;

    let mut archive = ZipArchive::new(Cursor::new(archive_data.clone()))?;
    let file_names: Vec<PathBuf> = archive.file_names().map(PathBuf::from).collect();
    let prefix_to_strip = find_common_prefix(&file_names);

    for index in 0..archive.len() {
        let mut file = archive.by_index(index)?;
        let enclosed_path = match file.enclosed_name() {
            Some(path) => path.to_path_buf(),
            None => continue,
        };

        let final_path_part = if let Some(prefix) = &prefix_to_strip {
            enclosed_path
                .strip_prefix(prefix)
                .unwrap_or(&enclosed_path)
                .to_path_buf()
        } else {
            enclosed_path
        };

        if final_path_part.as_os_str().is_empty() {
            continue;
        }

        let outpath = target_dir.join(final_path_part);

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)?;
                }
            }
            let mut outfile = fs::File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode))?;
            }
        }
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
enum RawAuthor {
    Simple(String),
    Detailed { name: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPreferenceData {
    pub title: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPreference {
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub required: Option<bool>,
    #[serde(default)]
    pub default: JsonValue,
    pub data: Option<Vec<RawPreferenceData>>,
    pub label: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawCommandInfo {
    name: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    mode: Option<String>,
    interval: Option<String>,
    preferences: Option<Vec<RawPreference>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPackageJson {
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    author: Option<RawAuthor>,
    owner: Option<String>,
    version: Option<String>,
    commands: Option<Vec<RawCommandInfo>>,
    preferences: Option<Vec<RawPreference>>,
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn json_value_to_proto(value: JsonValue) -> ::prost_types::Value {
    use prost_types::{value::Kind, ListValue, Struct, Value};

    let kind = match value {
        JsonValue::Null => Kind::NullValue(0),
        JsonValue::Bool(value) => Kind::BoolValue(value),
        JsonValue::Number(value) => Kind::NumberValue(value.as_f64().unwrap_or_default()),
        JsonValue::String(value) => Kind::StringValue(value),
        JsonValue::Array(values) => Kind::ListValue(ListValue {
            values: values.into_iter().map(json_value_to_proto).collect(),
        }),
        JsonValue::Object(values) => Kind::StructValue(Struct {
            fields: values
                .into_iter()
                .map(|(key, value)| (key, json_value_to_proto(value)))
                .collect(),
        }),
    };

    Value { kind: Some(kind) }
}

fn proto_value_to_json(value: &::prost_types::Value) -> JsonValue {
    use prost_types::value::Kind;

    match &value.kind {
        Some(Kind::NullValue(_)) | None => JsonValue::Null,
        Some(Kind::NumberValue(value)) => serde_json::Number::from_f64(*value)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        Some(Kind::StringValue(value)) => JsonValue::String(value.clone()),
        Some(Kind::BoolValue(value)) => JsonValue::Bool(*value),
        Some(Kind::StructValue(value)) => JsonValue::Object(
            value
                .fields
                .iter()
                .map(|(key, value)| (key.clone(), proto_value_to_json(value)))
                .collect(),
        ),
        Some(Kind::ListValue(value)) => {
            JsonValue::Array(value.values.iter().map(proto_value_to_json).collect())
        }
    }
}

fn raw_author_to_proto(author: Option<RawAuthor>) -> Option<proto::ManifestAuthor> {
    author.and_then(|author| match author {
        RawAuthor::Simple(value) => normalize_optional_string(Some(value)).map(|value| {
            proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Simple(value)),
            }
        }),
        RawAuthor::Detailed { name } => normalize_optional_string(Some(name)).map(|name| {
            proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Detailed(proto::AuthorName {
                    name,
                })),
            }
        }),
    })
}

fn raw_preference_to_proto(preference: RawPreference) -> proto::PreferenceDefinition {
    proto::PreferenceDefinition {
        name: preference.name.trim().to_string(),
        r#type: preference.r#type.trim().to_string(),
        title: normalize_optional_string(preference.title),
        description: normalize_optional_string(preference.description),
        required: preference.required,
        default_value: match preference.default {
            JsonValue::Null => None,
            value => Some(json_value_to_proto(value)),
        },
        data: preference
            .data
            .unwrap_or_default()
            .into_iter()
            .map(|entry| proto::PreferenceOption {
                title: entry.title,
                value: entry.value,
            })
            .collect(),
        label: normalize_optional_string(preference.label),
    }
}

fn raw_command_to_proto(command: RawCommandInfo) -> proto::CommandManifest {
    proto::CommandManifest {
        name: command.name.trim().to_string(),
        title: normalize_optional_string(command.title),
        description: normalize_optional_string(command.description),
        icon: normalize_optional_string(command.icon),
        mode: normalize_optional_string(command.mode),
        interval: normalize_optional_string(command.interval),
        preferences: command
            .preferences
            .unwrap_or_default()
            .into_iter()
            .map(raw_preference_to_proto)
            .collect(),
    }
}

fn raw_package_json_to_proto(package_json: RawPackageJson) -> proto::ExtensionManifest {
    proto::ExtensionManifest {
        name: normalize_optional_string(package_json.name),
        title: normalize_optional_string(package_json.title),
        description: normalize_optional_string(package_json.description),
        icon: normalize_optional_string(package_json.icon),
        author: raw_author_to_proto(package_json.author),
        owner: normalize_optional_string(package_json.owner),
        version: normalize_optional_string(package_json.version),
        commands: package_json
            .commands
            .unwrap_or_default()
            .into_iter()
            .map(raw_command_to_proto)
            .collect(),
        preferences: package_json
            .preferences
            .unwrap_or_default()
            .into_iter()
            .map(raw_preference_to_proto)
            .collect(),
    }
}

fn manifest_author_to_json(author: &proto::ManifestAuthor) -> JsonValue {
    match &author.author {
        Some(proto::manifest_author::Author::Simple(value)) => json!({ "simple": value }),
        Some(proto::manifest_author::Author::Detailed(value)) => {
            json!({ "detailed": { "name": value.name } })
        }
        None => JsonValue::Null,
    }
}

fn preference_to_json(preference: &proto::PreferenceDefinition) -> JsonValue {
    json!({
        "name": preference.name,
        "type": preference.r#type,
        "title": preference.title,
        "description": preference.description,
        "required": preference.required,
        "defaultValue": preference.default_value.as_ref().map(proto_value_to_json),
        "data": preference.data.iter().map(|entry| {
            json!({
                "title": entry.title,
                "value": entry.value,
            })
        }).collect::<Vec<_>>(),
        "label": preference.label,
    })
}

fn discovered_plugin_to_json(plugin: &proto::DiscoveredPlugin) -> JsonValue {
    json!({
        "title": plugin.title,
        "description": plugin.description,
        "pluginTitle": plugin.plugin_title,
        "pluginName": plugin.plugin_name,
        "commandName": plugin.command_name,
        "pluginPath": plugin.plugin_path,
        "icon": plugin.icon,
        "preferences": plugin.preferences.iter().map(preference_to_json).collect::<Vec<_>>(),
        "commandPreferences": plugin.command_preferences.iter().map(preference_to_json).collect::<Vec<_>>(),
        "mode": plugin.mode,
        "interval": plugin.interval,
        "author": plugin.author.as_ref().map(manifest_author_to_json),
        "owner": plugin.owner,
        "version": plugin.version,
    })
}

pub fn discover_plugins(app: &tauri::AppHandle) -> Result<Vec<proto::DiscoveredPlugin>> {
    let plugins_base_dir = get_extension_dir(app, "")?;
    let mut plugins = Vec::new();

    if !plugins_base_dir.exists() {
        fs::create_dir_all(&plugins_base_dir)?;
        return Ok(plugins);
    }

    let plugin_dirs = fs::read_dir(plugins_base_dir)?
        .filter_map(std::result::Result::ok)
        .filter(|entry| entry.path().is_dir());

    for plugin_dir_entry in plugin_dirs {
        let plugin_dir = plugin_dir_entry.path();
        let plugin_dir_name = plugin_dir
            .file_name()
            .and_then(|segment| segment.to_str())
            .unwrap_or_default()
            .to_string();
        let package_json_path = plugin_dir.join(EXTENSIONS_CONFIG.package_json_file_name);

        if !package_json_path.exists() {
            eprintln!("Plugin {plugin_dir_name} has no package.json, skipping");
            continue;
        }

        let package_json_content = match fs::read_to_string(&package_json_path) {
            Ok(content) => content,
            Err(error) => {
                eprintln!("Error reading package.json for plugin {plugin_dir_name}: {error}");
                continue;
            }
        };

        let package_json: RawPackageJson = match serde_json::from_str(&package_json_content) {
            Ok(parsed) => parsed,
            Err(error) => {
                eprintln!("Error parsing package.json for plugin {plugin_dir_name}: {error}");
                continue;
            }
        };

        let manifest = raw_package_json_to_proto(package_json);
        let plugin_title = manifest
            .title
            .clone()
            .unwrap_or_else(|| plugin_dir_name.clone());
        let plugin_name = manifest
            .name
            .clone()
            .unwrap_or_else(|| plugin_dir_name.clone());

        for command in &manifest.commands {
            if command.name.trim().is_empty() {
                continue;
            }

            let command_file_path = plugin_dir.join(format!("{}.js", command.name));
            if command_file_path.exists() {
                let resolved_icon = resolve_plugin_icon_reference(
                    &plugin_dir,
                    command.icon.as_deref().or(manifest.icon.as_deref()),
                );
                plugins.push(proto::DiscoveredPlugin {
                    title: command
                        .title
                        .clone()
                        .unwrap_or_else(|| command.name.clone()),
                    description: command
                        .description
                        .clone()
                        .or_else(|| manifest.description.clone()),
                    plugin_title: plugin_title.clone(),
                    plugin_name: plugin_name.clone(),
                    command_name: command.name.clone(),
                    plugin_path: command_file_path.to_string_lossy().to_string(),
                    icon: resolved_icon,
                    preferences: manifest.preferences.clone(),
                    command_preferences: command.preferences.clone(),
                    mode: command.mode.clone(),
                    interval: command.interval.clone(),
                    author: manifest.author.clone(),
                    owner: manifest.owner.clone(),
                    version: manifest.version.clone(),
                });
            } else {
                eprintln!(
                    "Command file {} not found for command {}",
                    command_file_path.display(),
                    command.name
                );
            }
        }
    }

    Ok(plugins)
}

#[tauri::command]
pub fn get_discovered_plugins(app: tauri::AppHandle) -> Result<Vec<JsonValue>> {
    discover_plugins(&app).map(|plugins| {
        plugins
            .iter()
            .map(discovered_plugin_to_json)
            .collect::<Vec<_>>()
    })
}

#[tauri::command]
pub async fn install_extension(
    app: tauri::AppHandle,
    download_url: String,
    slug: String,
    force: bool,
) -> Result<InstallResult> {
    if !is_valid_extension_slug(&slug) {
        return Err(ExtensionsError::InvalidSlug(slug));
    }

    let extension_dir = get_extension_dir(&app, &slug)?;
    let content = download_archive(&download_url).await?;

    if !force {
        let violations = run_heuristic_checks(&content)?;
        if !violations.is_empty() {
            return Ok(InstallResult::RequiresConfirmation { violations });
        }
    }

    extract_archive(&content, &extension_dir)?;
    Ok(InstallResult::Success)
}

#[tauri::command]
pub fn uninstall_extension(app: tauri::AppHandle, slug: String) -> Result<bool> {
    if !is_valid_extension_slug(&slug) {
        return Err(ExtensionsError::InvalidSlug(slug));
    }

    let extension_dir = get_extension_dir(&app, &slug)?;
    if !extension_dir.exists() {
        return Ok(false);
    }

    fs::remove_dir_all(extension_dir)?;
    Ok(true)
}
