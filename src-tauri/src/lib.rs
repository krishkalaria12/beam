mod app_commands;
pub mod applications;
pub mod config;
pub mod error;
pub mod search;
pub mod utils;

use tauri::Manager;

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
        .plugin(tauri_plugin_store::Builder::new().build())
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
