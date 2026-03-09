use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub const GNOME_EXTENSION_ID: &str = "beam@beam-linux";

const METADATA_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/metadata.json"
));
const EXTENSION_JS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/extension.js"
));
const STYLESHEET_CSS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/stylesheet.css"
));

pub fn extension_install_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(
        PathBuf::from(home)
            .join(".local/share/gnome-shell/extensions")
            .join(GNOME_EXTENSION_ID),
    )
}

fn write_file(path: &Path, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|error| format!("failed to write {}: {error}", path.display()))
}

pub fn install_extension_files() -> Result<PathBuf, String> {
    let install_dir =
        extension_install_dir().ok_or_else(|| "HOME is unavailable; cannot install extension".to_string())?;
    fs::create_dir_all(&install_dir)
        .map_err(|error| format!("failed to create extension directory: {error}"))?;

    write_file(&install_dir.join("metadata.json"), METADATA_JSON)?;
    write_file(&install_dir.join("extension.js"), EXTENSION_JS)?;
    write_file(&install_dir.join("stylesheet.css"), STYLESHEET_CSS)?;

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
pub fn install_gnome_shell_extension() -> Result<String, String> {
    let install_dir = install_extension_files()?;
    if gnome_extensions_available() {
        let _ = run_gnome_extensions(&["disable", GNOME_EXTENSION_ID]);
        let _ = run_gnome_extensions(&["enable", GNOME_EXTENSION_ID]);
    }
    Ok(install_dir.display().to_string())
}

fn run_gnome_extensions(args: &[&str]) -> Result<(), String> {
    let output = Command::new("gnome-extensions")
        .args(args)
        .output()
        .map_err(|error| format!("failed to execute gnome-extensions: {error}"))?;

    if output.status.success() {
        return Ok(());
    }

    Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
}

pub fn enable_extension() -> Result<(), String> {
    if !gnome_extensions_available() {
        return Err(
            "gnome-extensions CLI is unavailable; enable the extension from GNOME Extensions manually"
                .to_string(),
        );
    }
    run_gnome_extensions(&["enable", GNOME_EXTENSION_ID])
}

#[tauri::command]
pub fn enable_gnome_shell_extension() -> Result<(), String> {
    enable_extension()
}

pub fn open_extension_directory() -> Result<(), String> {
    let install_dir =
        extension_install_dir().ok_or_else(|| "HOME is unavailable; cannot open extension directory".to_string())?;
    open::that(install_dir).map_err(|error| format!("failed to open extension directory: {error}"))
}

#[tauri::command]
pub fn open_gnome_shell_extension_directory() -> Result<(), String> {
    open_extension_directory()
}
