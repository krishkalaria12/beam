use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::linux_desktop::gnome_extension::config::CONFIG as GNOME_EXTENSION_CONFIG;

use super::error::{GnomeExtensionError, Result};

pub fn extension_install_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let config = GNOME_EXTENSION_CONFIG;
    Some(
        PathBuf::from(home)
            .join(".local/share/gnome-shell/extensions")
            .join(config.extension_id),
    )
}

fn write_file(path: &Path, contents: &str) -> Result<()> {
    fs::write(path, contents).map_err(|error| {
        GnomeExtensionError::FileSystemError(format!("failed to write {}: {error}", path.display()))
    })
}

pub fn install_extension_files() -> Result<PathBuf> {
    let config = GNOME_EXTENSION_CONFIG;
    let install_dir = extension_install_dir().ok_or_else(|| {
        GnomeExtensionError::HomeDirectoryUnavailable(
            "HOME is unavailable; cannot install extension".to_string(),
        )
    })?;
    fs::create_dir_all(&install_dir).map_err(|error| {
        GnomeExtensionError::FileSystemError(format!(
            "failed to create extension directory: {error}"
        ))
    })?;

    write_file(
        &install_dir.join("metadata.json"),
        config.extension_metadata_json,
    )?;
    write_file(&install_dir.join("extension.js"), config.extension_js)?;
    write_file(
        &install_dir.join("stylesheet.css"),
        config.extension_stylesheet_css,
    )?;

    Ok(install_dir)
}

fn gnome_extensions_available() -> bool {
    Command::new("gnome-extensions")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn extension_enabled() -> bool {
    let config = GNOME_EXTENSION_CONFIG;
    let output = Command::new("gnome-extensions")
        .args(["info", config.extension_id])
        .output();
    let Ok(output) = output else {
        return false;
    };
    if !output.status.success() {
        return false;
    }
    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
    stdout.contains("state: enabled") || stdout.contains("enabled: yes")
}

fn extension_files_outdated(install_dir: &Path) -> bool {
    let config = GNOME_EXTENSION_CONFIG;

    let expected_files = [
        ("metadata.json", config.extension_metadata_json),
        ("extension.js", config.extension_js),
        ("stylesheet.css", config.extension_stylesheet_css),
    ];

    expected_files.into_iter().any(|(name, expected)| {
        fs::read_to_string(install_dir.join(name))
            .map(|contents| contents != expected)
            .unwrap_or(true)
    })
}

pub fn refresh_installed_extension_if_needed() -> Result<bool> {
    let Some(install_dir) = extension_install_dir() else {
        return Ok(false);
    };
    if !install_dir.exists() || !extension_files_outdated(&install_dir) {
        return Ok(false);
    }

    let was_enabled = gnome_extensions_available() && extension_enabled();
    install_extension_files()?;

    if was_enabled {
        let config = GNOME_EXTENSION_CONFIG;
        let _ = run_gnome_extensions(&["disable", config.extension_id]);
        let _ = run_gnome_extensions(&["enable", config.extension_id]);
    }

    Ok(true)
}

#[tauri::command]
pub fn install_gnome_shell_extension() -> Result<String> {
    let config = GNOME_EXTENSION_CONFIG;
    let install_dir = install_extension_files()?;
    if gnome_extensions_available() {
        let _ = run_gnome_extensions(&["disable", config.extension_id]);
        let _ = run_gnome_extensions(&["enable", config.extension_id]);
    }
    Ok(install_dir.display().to_string())
}

fn run_gnome_extensions(args: &[&str]) -> Result<()> {
    let output = Command::new("gnome-extensions")
        .args(args)
        .output()
        .map_err(|error| {
            GnomeExtensionError::CommandExecutionError(format!(
                "failed to execute gnome-extensions: {error}"
            ))
        })?;

    if output.status.success() {
        return Ok(());
    }

    Err(GnomeExtensionError::CommandFailed(
        String::from_utf8_lossy(&output.stderr).trim().to_string(),
    ))
}

pub fn enable_extension() -> Result<()> {
    let config = GNOME_EXTENSION_CONFIG;
    if !gnome_extensions_available() {
        return Err(GnomeExtensionError::CommandExecutionError(
            "gnome-extensions CLI is unavailable; enable the extension from GNOME Extensions manually"
                .to_string(),
        ));
    }
    run_gnome_extensions(&["enable", config.extension_id])
}

#[tauri::command]
pub fn enable_gnome_shell_extension() -> Result<()> {
    enable_extension()
}

pub fn open_extension_directory() -> Result<()> {
    let install_dir = extension_install_dir().ok_or_else(|| {
        GnomeExtensionError::HomeDirectoryUnavailable(
            "HOME is unavailable; cannot open extension directory".to_string(),
        )
    })?;
    open::that(install_dir).map_err(|error| {
        GnomeExtensionError::OpenDirectoryError(format!(
            "failed to open extension directory: {error}"
        ))
    })
}

#[tauri::command]
pub fn open_gnome_shell_extension_directory() -> Result<()> {
    open_extension_directory()
}
