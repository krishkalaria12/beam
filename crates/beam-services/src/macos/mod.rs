//! macOS backend implementation.
//!
//! Mirrors the public surface of `linux_desktop` so shared command layers can
//! dispatch per-platform while keeping identical serde contracts.
//!
//! PORT: apps/desktop/src-tauri/src/macos/mod.rs — the Tauri setup hook
//! became a plain function the binary calls during startup.

pub mod applications;
pub mod ax;
pub mod clipboard;
pub mod events;
pub mod icons;
pub mod launch_services;
pub mod permissions;
pub mod window_manager;
pub mod workspace;

/// One-time setup executed during application startup.
pub fn initialize() {
    if !permissions::accessibility_granted() {
        log::info!(
            "accessibility permission is not granted yet; window switching and selection \
             features will stay unavailable until it is granted"
        );
    }
}
