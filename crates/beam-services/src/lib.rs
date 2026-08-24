// PORT: apps/desktop/src-tauri/src/lib.rs
// Copied verbatim; no Tauri APIs in this file.
//! `beam-services` — the `apps/desktop/src-tauri/src` module tree, preserved
//! 1:1 (plan §05), with the Tauri attachment removed per the de-Tauri
//! contract:
//!
//! - `#[tauri::command]` attributes are deleted; function names and argument
//!   order are preserved so the ledger stays greppable.
//! - `app: AppHandle` becomes `cx: &BeamContext` (first parameter, always).
//! - `Result<T, String>` becomes the module's typed `thiserror` error.
//! - `app.emit(name, json!)` becomes `cx.emit(BeamEvent::…)`.
//! - `tauri_plugin_store` becomes `cx.settings()` (same files, same keys).
//! - `tauri::async_runtime::spawn` becomes `tokio::spawn`.
//!
//! Modules land here as their lanes convert them; the tree below grows to
//! match `apps/desktop/src-tauri/src` until cutover deletes the original.
//! Converted so far (G1, batch 1): config, error, utils, http, calculator,
//! emoji, search, system_actions, dictionary, translation, cli,
//! file_search, snippets (model), state, settings (D5: theming surface
//! deleted, not ported).

pub mod ai;
pub mod applications;
pub mod calculator;
pub mod cli;
pub mod clipboard;
pub mod config;
pub mod danksearch;
pub mod desktop;
pub mod extensions;
pub mod focus;
pub mod fuzzy_search;
pub mod hotkeys;
pub mod hyprwhspr;
pub mod launcher_shell;
pub mod menu_bar;

pub mod custom_config;
pub mod dictionary;
pub mod emoji;
pub mod error;
pub mod file_search;
pub mod http;
#[cfg(target_os = "linux")]
pub mod linux_desktop;
#[cfg(target_os = "macos")]
pub mod macos;
pub mod notes;
pub mod pinned;
pub mod quicklinks;
pub mod script_commands;
pub mod search;
pub mod settings;
pub mod snippets;
pub mod state;
pub mod system_actions;
pub mod todo;
pub mod translation;
pub mod utils;
pub mod window_switcher;
#[cfg(target_os = "windows")]
pub mod windows_desktop;
