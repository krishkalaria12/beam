use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use tauri::Manager;
use walkdir::{DirEntry, WalkDir};

use crate::config::config;

use super::error::{Result, ScriptCommandsError};
use super::metadata::read_argument_definitions;
use super::runtime::{has_shebang, is_executable};
use super::types::ScriptCommandSummary;

fn should_skip_entry(entry: &DirEntry) -> bool {
    let file_name = entry.file_name().to_string_lossy();

    if file_name.starts_with('.') {
        return true;
    }

    entry.file_type().is_dir() && (file_name == "node_modules" || file_name == ".git")
}

fn hash_script_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    let hash = hasher.finalize();
    let short_hash: String = hash
        .iter()
        .take(10)
        .map(|byte| format!("{byte:02x}"))
        .collect();
    format!("script-{short_hash}")
}

fn to_display_title(file_stem: &str) -> String {
    let normalized = file_stem.replace(['_', '-'], " ");
    let collapsed = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.is_empty() {
        return "script".to_string();
    }
    collapsed
}

pub(super) fn resolve_script_commands_directory(app: &tauri::AppHandle) -> Result<PathBuf> {
    let base_directory = app
        .path()
        .app_local_data_dir()
        .map_err(|_| ScriptCommandsError::AppDataDirUnavailable)?;

    let script_directory = base_directory.join(config().SCRIPT_COMMANDS_DIRECTORY);
    fs::create_dir_all(&script_directory)
        .map_err(|error| ScriptCommandsError::CreateScriptDirectoryFailed(error.to_string()))?;

    script_directory
        .canonicalize()
        .map_err(|error| ScriptCommandsError::ResolveScriptDirectoryFailed(error.to_string()))
}

pub(super) fn discover_script_commands(root: &Path) -> Vec<ScriptCommandSummary> {
    let mut commands: Vec<ScriptCommandSummary> = Vec::new();

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !should_skip_entry(entry))
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let detected_shebang = has_shebang(path);
        if !detected_shebang && !is_executable(path) {
            continue;
        }

        let canonical_path = match path.canonicalize() {
            Ok(path) => path,
            Err(_) => continue,
        };

        if !canonical_path.starts_with(root) {
            continue;
        }

        let script_name = canonical_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("script")
            .to_string();
        let file_stem = canonical_path
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("script");
        let script_extension = canonical_path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_string());
        let argument_definitions = read_argument_definitions(&canonical_path);
        let required_argument_count = argument_definitions
            .iter()
            .filter(|definition| definition.required)
            .count();

        commands.push(ScriptCommandSummary {
            id: hash_script_id(&canonical_path),
            title: to_display_title(file_stem),
            subtitle: canonical_path.to_string_lossy().to_string(),
            script_path: canonical_path.to_string_lossy().to_string(),
            script_name,
            script_extension,
            has_shebang: detected_shebang,
            argument_definitions,
            required_argument_count,
        });
    }

    commands.sort_by(|left, right| left.title.to_lowercase().cmp(&right.title.to_lowercase()));
    commands
}
