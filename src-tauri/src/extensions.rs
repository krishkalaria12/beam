use std::fs;
use std::io::{self, Cursor, Read};
use std::path::{Path, PathBuf};

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use zip::result::ZipError;
use zip::ZipArchive;

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
        if file_content.contains("runAppleScript") {
            Some(HeuristicViolation {
                command_name: command_title.to_string(),
                reason: "Possible usage of AppleScript (runAppleScript)".to_string(),
            })
        } else {
            None
        }
    }
}

struct MacOSPathHeuristic;
impl IncompatibilityHeuristic for MacOSPathHeuristic {
    fn check(&self, command_title: &str, file_content: &str) -> Option<HeuristicViolation> {
        let macos_paths = ["/Applications/", "/Library/", "/Users/"];
        for path in macos_paths {
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

fn get_extension_dir(app: &tauri::AppHandle, slug: &str) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| "Failed to get app local data dir".to_string())?;

    Ok(data_dir.join("plugins").join(slug))
}

fn is_valid_extension_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
}

async fn download_archive(url: &str) -> Result<Bytes, String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to download extension: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download extension: status code {}",
            response.status()
        ));
    }

    response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {e}"))
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
) -> Result<Vec<(String, String)>, String> {
    let package_json_path = if let Some(path_prefix) = prefix {
        path_prefix.join("package.json")
    } else {
        PathBuf::from("package.json")
    };

    let mut package_file = match archive.by_name(&package_json_path.to_string_lossy()) {
        Ok(file) => file,
        Err(ZipError::FileNotFound) => return Ok(vec![]),
        Err(err) => return Err(err.to_string()),
    };

    let mut package_content = String::new();
    package_file
        .read_to_string(&mut package_content)
        .map_err(|e| e.to_string())?;

    let package_json: serde_json::Value = serde_json::from_str(&package_content)
        .map_err(|_| "Failed to parse package.json".to_string())?;

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

fn run_heuristic_checks(archive_data: &Bytes) -> Result<Vec<HeuristicViolation>, String> {
    let heuristics: Vec<Box<dyn IncompatibilityHeuristic + Send + Sync>> =
        vec![Box::new(AppleScriptHeuristic), Box::new(MacOSPathHeuristic)];
    if heuristics.is_empty() {
        return Ok(vec![]);
    }

    let mut archive =
        ZipArchive::new(Cursor::new(archive_data.clone())).map_err(|e| e.to_string())?;
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

fn extract_archive(archive_data: &Bytes, target_dir: &Path) -> Result<(), String> {
    if target_dir.exists() {
        fs::remove_dir_all(target_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;

    let mut archive =
        ZipArchive::new(Cursor::new(archive_data.clone())).map_err(|e| e.to_string())?;
    let file_names: Vec<PathBuf> = archive.file_names().map(PathBuf::from).collect();
    let prefix_to_strip = find_common_prefix(&file_names);

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|e| e.to_string())?;
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
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode))
                    .map_err(|e| e.to_string())?;
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
    subtitle: Option<String>,
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

pub fn discover_plugins(app: &tauri::AppHandle) -> Result<Vec<PluginInfo>, String> {
    let plugins_base_dir = get_extension_dir(app, "")?;
    let mut plugins = Vec::new();

    if !plugins_base_dir.exists() {
        fs::create_dir_all(&plugins_base_dir)
            .map_err(|e| format!("Failed to create plugins directory: {e}"))?;
        return Ok(plugins);
    }

    let plugin_dirs = fs::read_dir(plugins_base_dir)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir());

    for plugin_dir_entry in plugin_dirs {
        let plugin_dir = plugin_dir_entry.path();
        let plugin_dir_name = plugin_dir
            .file_name()
            .and_then(|segment| segment.to_str())
            .unwrap_or_default()
            .to_string();
        let package_json_path = plugin_dir.join("package.json");

        if !package_json_path.exists() {
            eprintln!("Plugin {plugin_dir_name} has no package.json, skipping");
            continue;
        }

        let package_json_content = match fs::read_to_string(&package_json_path) {
            Ok(content) => content,
            Err(err) => {
                eprintln!("Error reading package.json for plugin {plugin_dir_name}: {err}");
                continue;
            }
        };

        let package_json: PackageJson = match serde_json::from_str(&package_json_content) {
            Ok(parsed) => parsed,
            Err(err) => {
                eprintln!("Error parsing package.json for plugin {plugin_dir_name}: {err}");
                continue;
            }
        };

        if let Some(commands) = package_json.commands {
            for command in commands {
                let command_file_path = plugin_dir.join(format!("{}.js", command.name));
                if command_file_path.exists() {
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
                        icon: command.icon.or_else(|| package_json.icon.clone()),
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
pub fn get_discovered_plugins(app: tauri::AppHandle) -> Result<Vec<PluginInfo>, String> {
    discover_plugins(&app)
}

#[tauri::command]
pub async fn install_extension(
    app: tauri::AppHandle,
    download_url: String,
    slug: String,
    force: bool,
) -> Result<InstallResult, String> {
    if !is_valid_extension_slug(&slug) {
        return Err("Invalid extension slug".to_string());
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
pub fn uninstall_extension(app: tauri::AppHandle, slug: String) -> Result<bool, String> {
    if !is_valid_extension_slug(&slug) {
        return Err("Invalid extension slug".to_string());
    }

    let extension_dir = get_extension_dir(&app, &slug)?;
    if !extension_dir.exists() {
        return Ok(false);
    }

    fs::remove_dir_all(extension_dir).map_err(|e| format!("Failed to uninstall extension: {e}"))?;
    Ok(true)
}
