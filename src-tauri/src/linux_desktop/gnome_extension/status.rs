use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

use crate::config::config;

use super::dbus;
use super::install::extension_install_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GnomeExtensionStatus {
    pub installed: bool,
    pub enabled: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub dbus_reachable: bool,
    pub update_required: bool,
}

fn bundled_version() -> Option<String> {
    let metadata = config().LINUX_DESKTOP_GNOME_EXTENSION_METADATA_JSON;
    let value: Value = serde_json::from_str(metadata).ok()?;
    if let Some(string_version) = value.get("version").and_then(Value::as_str) {
        return Some(string_version.to_string());
    }
    value
        .get("version")
        .and_then(Value::as_i64)
        .map(|number| number.to_string())
}

fn installed_version(path: &PathBuf) -> Option<String> {
    let metadata = fs::read_to_string(path.join("metadata.json")).ok()?;
    let value: Value = serde_json::from_str(&metadata).ok()?;
    if let Some(string_version) = value.get("version").and_then(Value::as_str) {
        return Some(string_version.to_string());
    }
    value
        .get("version")
        .and_then(Value::as_i64)
        .map(|number| number.to_string())
}

fn extension_enabled() -> bool {
    let config = config();
    let output = std::process::Command::new("gnome-extensions")
        .args(["info", config.LINUX_DESKTOP_GNOME_EXTENSION_ID])
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

pub fn get_status() -> Option<GnomeExtensionStatus> {
    let path = extension_install_dir()?;
    let installed = path.exists();
    let bundled_version = bundled_version();
    let installed_version = if installed {
        installed_version(&path)
    } else {
        None
    };

    Some(GnomeExtensionStatus {
        installed,
        enabled: installed && extension_enabled(),
        version: installed_version.clone().or(bundled_version.clone()),
        path: installed.then(|| path.display().to_string()),
        dbus_reachable: dbus::ping(),
        update_required: installed
            && bundled_version.is_some()
            && bundled_version != installed_version,
    })
}
