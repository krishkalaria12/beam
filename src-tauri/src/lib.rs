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
pub mod hotkeys;
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

use tauri::{Emitter, Manager};

use crate::settings::UiLayoutMode;

fn toggle_launcher(app: &tauri::AppHandle) {
    hotkeys::toggle_launcher(app);
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

fn extract_run_command_arg(args: &[String]) -> Option<String> {
    let mut index = 0usize;
    while index < args.len() {
        let arg = args[index].trim();

        if let Some(command_id) = arg.strip_prefix("--run-command=") {
            let normalized = command_id.trim();
            if !normalized.is_empty() {
                return Some(normalized.to_string());
            }
        }

        if arg == "--run-command" {
            if let Some(next_arg) = args.get(index + 1) {
                let normalized = next_arg.trim();
                if !normalized.is_empty() {
                    return Some(normalized.to_string());
                }
            }
        }

        index += 1;
    }

    None
}

fn emit_deep_link(app: &tauri::AppHandle, deep_link: String) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.emit("deep-link", deep_link);
        let _ = main_window.unminimize();
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

fn handle_activation_args(app: &tauri::AppHandle, args: &[String], startup: bool) {
    if let Some(deep_link) = extract_deep_link_arg(args) {
        emit_deep_link(app, deep_link);
        return;
    }

    if let Some(command_id) = extract_run_command_arg(args) {
        if startup {
            hotkeys::dispatch_hotkey_command_startup(app, command_id);
        } else {
            hotkeys::dispatch_hotkey_command(app, command_id, "cli");
        }
        return;
    }

    if args.iter().any(|arg| arg == "--toggle") {
        toggle_launcher(app);
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
            handle_activation_args(app, &args, false);
        }));
    }

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                let startup_args: Vec<String> = std::env::args().collect();
                handle_activation_args(&app.handle(), &startup_args, true);
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

            hotkeys::initialize_hotkey_backend(&app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
