use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::config::config;

use super::error::{GnomeExtensionError, Result};

pub fn extension_install_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let config = config();
    Some(
        PathBuf::from(home)
            .join(".local/share/gnome-shell/extensions")
            .join(config.LINUX_DESKTOP_GNOME_EXTENSION_ID),
    )
}

fn write_file(path: &Path, contents: &str) -> Result<()> {
    fs::write(path, contents).map_err(|error| {
        GnomeExtensionError::FileSystemError(format!("failed to write {}: {error}", path.display()))
    })
}

pub fn install_extension_files() -> Result<PathBuf> {
    let config = config();
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
        config.LINUX_DESKTOP_GNOME_EXTENSION_METADATA_JSON,
    )?;
    write_file(
        &install_dir.join("extension.js"),
        config.LINUX_DESKTOP_GNOME_EXTENSION_JS,
    )?;
    write_file(
        &install_dir.join("stylesheet.css"),
        config.LINUX_DESKTOP_GNOME_EXTENSION_STYLESHEET_CSS,
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

#[tauri::command]
pub fn install_gnome_shell_extension() -> Result<String> {
    let config = config();
    let install_dir = install_extension_files()?;
    if gnome_extensions_available() {
        let _ = run_gnome_extensions(&["disable", config.LINUX_DESKTOP_GNOME_EXTENSION_ID]);
        let _ = run_gnome_extensions(&["enable", config.LINUX_DESKTOP_GNOME_EXTENSION_ID]);
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
    let config = config();
    if !gnome_extensions_available() {
        return Err(GnomeExtensionError::CommandExecutionError(
            "gnome-extensions CLI is unavailable; enable the extension from GNOME Extensions manually"
                .to_string(),
        ));
    }
    run_gnome_extensions(&["enable", config.LINUX_DESKTOP_GNOME_EXTENSION_ID])
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
