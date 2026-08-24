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
//! file_search, snippets (model), state.

pub mod calculator;
pub mod cli;
pub mod config;
pub mod dictionary;
pub mod emoji;
pub mod error;
pub mod file_search;
pub mod http;
pub mod search;
pub mod snippets;
pub mod state;
pub mod system_actions;
pub mod translation;
pub mod utils;
