use std::fs;
use std::path::{Component, Path};

use super::cache;
use super::discovery::resolve_script_commands_directory;
use super::error::{Error, Result};
use super::types::{CreateScriptCommandRequest, ScriptCommandSummary};

fn is_valid_script_file_name(file_name: &str) -> bool {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return false;
    }

    let candidate = Path::new(trimmed);
    if candidate.is_absolute() {
        return false;
    }

    let mut has_normal_component = false;
    for component in candidate.components() {
        match component {
            Component::Normal(_) => {
                has_normal_component = true;
            }
            Component::CurDir => {}
            Component::ParentDir | Component::Prefix(_) | Component::RootDir => {
                return false;
            }
        }
    }

    has_normal_component
}

#[cfg(unix)]
fn make_executable(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    let metadata = fs::metadata(path)
        .map_err(|error| Error::SetExecutablePermissionsFailed(error.to_string()))?;
    let mut permissions = metadata.permissions();
    permissions.set_mode(0o700);
    fs::set_permissions(path, permissions)
        .map_err(|error| Error::SetExecutablePermissionsFailed(error.to_string()))
}

#[cfg(not(unix))]
fn make_executable(_path: &Path) -> Result<()> {
    Ok(())
}

pub(super) fn create_script_command(
    app: &tauri::AppHandle,
    request: CreateScriptCommandRequest,
) -> Result<ScriptCommandSummary> {
    let normalized_name = request.file_name.trim();
    if !is_valid_script_file_name(normalized_name) {
        return Err(Error::InvalidScriptFileName);
    }

    let root = resolve_script_commands_directory(app)?;
    let target_path = root.join(normalized_name);

    if target_path.exists() && !request.overwrite {
        return Err(Error::ScriptAlreadyExists(normalized_name.to_string()));
    }

    if let Some(parent_dir) = target_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| Error::WriteScriptFileFailed(error.to_string()))?;
    }

    fs::write(&target_path, request.content.as_bytes())
        .map_err(|error| Error::WriteScriptFileFailed(error.to_string()))?;

    if request.make_executable {
        make_executable(&target_path)?;
    }

    let canonical_script_path = target_path
        .canonicalize()
        .map_err(|error| Error::ResolveScriptPathFailed(error.to_string()))?;
    if !canonical_script_path.starts_with(&root) {
        return Err(Error::ScriptPathOutsideRoot);
    }

    cache::invalidate_script_commands_cache();
    let commands = cache::get_script_commands(app)?;
    let canonical_path_str = canonical_script_path.to_string_lossy().to_string();
    commands
        .into_iter()
        .find(|entry| entry.script_path == canonical_path_str)
        .ok_or(Error::ScriptCreatedButNotIndexed)
}

pub(super) fn open_script_commands_directory(app: &tauri::AppHandle) -> Result<()> {
    let root = resolve_script_commands_directory(app)?;
    open::that(root)
        .map_err(|error| Error::OpenScriptCommandsDirectoryFailed(error.to_string()))?;
    Ok(())
}
