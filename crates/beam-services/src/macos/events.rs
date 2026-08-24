// PORT: apps/desktop/src-tauri/src/macos/events.rs
// Copied verbatim; no Tauri APIs in this file.
//! Keystroke synthesis helpers for macOS.
//!
//! Uses `osascript` against System Events, matching the behavior of the
//! existing non-Linux paste path. Requires Accessibility trust.

use std::process::{Command, Stdio};

pub fn post_paste_keystroke() {
    let _ = Command::new("osascript")
        .args([
            "-e",
            "tell application \"System Events\" to keystroke \"v\" using command down",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}
