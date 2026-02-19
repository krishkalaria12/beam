mod app_commands;
pub mod applications;
pub mod calculator;
pub mod clipboard;
pub mod config;
pub mod currency;
pub mod dictionary;
pub mod error;
pub mod file_search;
pub mod fuzzy_search;
pub mod http;
pub mod launcher_window;
pub mod quicklinks;
pub mod search;
pub mod settings;
pub mod state;
pub mod system_actions;
pub mod translation;
pub mod utils;

use tauri::Manager;

use crate::settings::UiLayoutMode;

fn toggle_launcher(app: &tauri::AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        if main_window.is_visible().unwrap_or(false) {
            let _ = main_window.hide();
        } else {
            let _ = main_window.unminimize();
            let _ = main_window.center();
            let _ = main_window.show();
            let _ = main_window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .manage(state::AppState::new())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard::init())
        .invoke_handler(app_commands::get_handler());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|arg| arg == "--toggle") {
                toggle_launcher(app);
            }
        }));
    }

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                if std::env::args().any(|arg| arg == "--toggle") {
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
                let _ = launcher_window::set_launcher_compact_mode(app.handle().clone(), compact, None);
            }

            // Initialize File Search Backend via State
            state::init(app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
