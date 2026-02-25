pub mod ai;
pub mod browser_extension;
pub mod error;
pub mod oauth;

use std::fs;
use std::io::{self, Cursor, Read};
use std::path::{Path, PathBuf};

use bytes::Bytes;
use error::{ExtensionsError, Result};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use zip::result::ZipError;
use zip::ZipArchive;

use crate::config::config;

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
        if file_content.contains(config().EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL) {
            Some(HeuristicViolation {
                command_name: command_title.to_string(),
                reason: format!(
                    "Possible usage of AppleScript ({})",
                    config().EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL
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
        for path in &config().EXTENSIONS_HEURISTIC_MACOS_PATHS {
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
        .join(config().EXTENSIONS_PLUGINS_DIRECTORY)
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
        path_prefix.join(config().EXTENSIONS_PACKAGE_JSON_FILE)
    } else {
        PathBuf::from(config().EXTENSIONS_PACKAGE_JSON_FILE)
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
pub enum Author {
    Simple(String),
    Detailed { name: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PreferenceData {
    pub title: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Preference {
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub required: Option<bool>,
    #[serde(default)]
    pub default: serde_json::Value,
    pub data: Option<Vec<PreferenceData>>,
    pub label: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct CommandInfo {
    name: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    mode: Option<String>,
    preferences: Option<Vec<Preference>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct PackageJson {
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    author: Option<Author>,
    owner: Option<String>,
    commands: Option<Vec<CommandInfo>>,
    preferences: Option<Vec<Preference>>,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub title: String,
    pub description: Option<String>,
    pub plugin_title: String,
    pub plugin_name: String,
    pub command_name: String,
    pub plugin_path: String,
    pub icon: Option<String>,
    pub preferences: Option<Vec<Preference>>,
    pub command_preferences: Option<Vec<Preference>>,
    pub mode: Option<String>,
    pub author: Option<Author>,
    pub owner: Option<String>,
}

pub fn discover_plugins(app: &tauri::AppHandle) -> Result<Vec<PluginInfo>> {
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
        let package_json_path = plugin_dir.join(config().EXTENSIONS_PACKAGE_JSON_FILE);

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

        let package_json: PackageJson = match serde_json::from_str(&package_json_content) {
            Ok(parsed) => parsed,
            Err(error) => {
                eprintln!("Error parsing package.json for plugin {plugin_dir_name}: {error}");
                continue;
            }
        };

        if let Some(commands) = package_json.commands {
            for command in commands {
                let command_file_path = plugin_dir.join(format!("{}.js", command.name));
                if command_file_path.exists() {
                    let resolved_icon = resolve_plugin_icon_reference(
                        &plugin_dir,
                        command.icon.as_deref().or(package_json.icon.as_deref()),
                    );
                    plugins.push(PluginInfo {
                        title: command
                            .title
                            .clone()
                            .unwrap_or_else(|| command.name.clone()),
                        description: command
                            .description
                            .or_else(|| package_json.description.clone()),
                        plugin_title: package_json
                            .title
                            .clone()
                            .unwrap_or_else(|| plugin_dir_name.clone()),
                        plugin_name: package_json
                            .name
                            .clone()
                            .unwrap_or_else(|| plugin_dir_name.clone()),
                        command_name: command.name.clone(),
                        plugin_path: command_file_path.to_string_lossy().to_string(),
                        icon: resolved_icon,
                        preferences: package_json.preferences.clone(),
                        command_preferences: command.preferences,
                        mode: command.mode,
                        author: package_json.author.clone(),
                        owner: package_json.owner.clone(),
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
    }

    Ok(plugins)
}

#[tauri::command]
pub fn get_discovered_plugins(app: tauri::AppHandle) -> Result<Vec<PluginInfo>> {
    discover_plugins(&app)
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
