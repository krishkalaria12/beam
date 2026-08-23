//! macOS backend implementation.
//!
//! Mirrors the public surface of `linux_desktop` so shared command layers can
//! dispatch per-platform while keeping identical serde contracts.

pub mod applications;
pub mod ax;
pub mod clipboard;
pub mod events;
pub mod icons;
pub mod launch_services;
pub mod permissions;
pub mod window_manager;
pub mod workspace;

use tauri::AppHandle;

/// One-time setup executed during Tauri's `setup` hook.
pub fn initialize(_app: &AppHandle) {
    if !permissions::accessibility_granted() {
        log::info!(
            "accessibility permission is not granted yet; window switching and selection \
             features will stay unavailable until it is granted"
        );
    }
}
