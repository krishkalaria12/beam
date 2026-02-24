mod app_commands;
pub mod applications;
pub mod calculator;
pub mod clipboard;
pub mod config;
pub mod dictionary;
pub mod error;
pub mod extensions;
pub mod file_search;
pub mod fuzzy_search;
pub mod http;
pub mod hyprwhspr;
pub mod launcher_window;
pub mod pinned;
pub mod quicklinks;
pub mod search;
pub mod settings;
pub mod state;
pub mod system_actions;
pub mod translation;
pub mod utils;

use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

use crate::settings::UiLayoutMode;

static LAST_TOGGLE: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();

fn should_toggle_now() -> bool {
    let now = Instant::now();
    let min_interval = Duration::from_millis(250);
    let lock = LAST_TOGGLE.get_or_init(|| Mutex::new(None));

    if let Ok(mut last) = lock.lock() {
        if let Some(previous) = *last {
            if now.duration_since(previous) < min_interval {
                return false;
            }
        }
        *last = Some(now);
        return true;
    }

    true
}

fn toggle_launcher(app: &tauri::AppHandle) {
    if !should_toggle_now() {
        return;
    }

    if let Some(main_window) = app.get_webview_window("main") {
        let is_visible = main_window.is_visible().unwrap_or(false);
        let is_focused = main_window.is_focused().unwrap_or(false);

        // Only hide when the launcher is actively focused; otherwise treat toggle as "bring to front".
        if is_visible && is_focused {
            let _ = main_window.hide();
        } else {
            let _ = main_window.unminimize();
            let _ = main_window.show();
            let _ = main_window.center();
            let _ = main_window.set_focus();
        }
    }
}

fn extract_deep_link_arg(args: &[String]) -> Option<String> {
    args.iter()
        .find(|arg| {
            arg.starts_with("raycast://")
                || arg.starts_with("https://raycast.com/redirect")
                || arg.starts_with("http://raycast.com/redirect")
        })
        .cloned()
}

fn emit_deep_link(app: &tauri::AppHandle, deep_link: String) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.emit("deep-link", deep_link);
        let _ = main_window.unminimize();
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .manage(state::AppState::new())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(app_commands::get_handler());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(deep_link) = extract_deep_link_arg(&args) {
                emit_deep_link(app, deep_link);
                return;
            }

            if args.iter().any(|arg| arg == "--toggle") {
                toggle_launcher(app);
            }
        }));
    }

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                let startup_args: Vec<String> = std::env::args().collect();

                if let Some(deep_link) = extract_deep_link_arg(&startup_args) {
                    emit_deep_link(&app.handle(), deep_link);
                } else if startup_args.iter().any(|arg| arg == "--toggle") {
                    toggle_launcher(&app.handle());
                }
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            clipboard::start_clipboard_listener(app.handle().clone());

            if let Ok(layout_mode) = settings::get_ui_layout_mode(app.handle().clone()) {
                let compact = matches!(layout_mode, UiLayoutMode::Compressed);
                let _ =
                    launcher_window::set_launcher_compact_mode(app.handle().clone(), compact, None);
            }

            // Initialize File Search Backend via State
            state::init(app.handle());

            if let Err(error) = calculator::initialize(&app.handle()) {
                log::warn!("failed to initialize soulver calculator: {error}");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
