//! macOS permission plumbing.
//!
//! Window listing, focus, selected text, and Finder selection all require the
//! Accessibility (AX) trust bit. Beam surfaces this to the frontend through
//! `get_macos_permission_status` / `request_macos_permission` so a UI can
//! guide users to System Settings.

// PORT: apps/desktop/src-tauri/src/macos/permissions.rs
// The command attributes moved to the service layer (settings-adjacent
// surface); these functions stay pure.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MacosPermissionStatus {
    pub accessibility: bool,
}

pub fn accessibility_granted() -> bool {
    unsafe { crate::macos::ax::ax_is_trusted(false) }
}

/// Prompts the user with the system dialog offering to open System Settings.
pub fn prompt_accessibility() -> bool {
    unsafe { crate::macos::ax::ax_is_trusted(true) }
}

pub fn get_macos_permission_status() -> MacosPermissionStatus {
    MacosPermissionStatus {
        accessibility: accessibility_granted(),
    }
}

pub fn request_macos_permission() -> MacosPermissionStatus {
    let granted = prompt_accessibility();
    MacosPermissionStatus {
        accessibility: granted,
    }
}
