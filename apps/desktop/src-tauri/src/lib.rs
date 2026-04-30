pub mod ai;
mod app_commands;
pub mod applications;
pub mod calculator;
pub mod cli;
pub mod clipboard;
pub mod config;
pub mod custom_config;
pub mod danksearch;
pub mod dictionary;
pub mod emoji;
pub mod error;
pub mod extensions;
pub mod file_search;
pub mod focus;
pub mod fuzzy_search;
pub mod hotkeys;
pub mod http;
pub mod hyprwhspr;
pub mod launcher_shell;
pub mod launcher_theme;
pub mod launcher_window;
pub mod linux_desktop;
pub mod menu_bar;
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

#[cfg(target_os = "linux")]
use std::fs;
#[cfg(target_os = "linux")]
use std::path::{Path, PathBuf};
#[cfg(target_os = "linux")]
use std::process::Command;

use tauri::{Emitter, Manager, WindowEvent};

use crate::settings::UiLayoutMode;

fn toggle_launcher(app: &tauri::AppHandle) {
    hotkeys::toggle_launcher(app);
}

fn extract_deep_link_arg(args: &[String]) -> Option<String> {
    args.iter()
        .find(|arg| {
            arg.starts_with("raycast://")
                || arg.starts_with("beam://")
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
    }

    let _ = launcher_window::reveal_launcher_window(app);
}

fn handle_activation_args(app: &tauri::AppHandle, args: &[String], startup: bool) -> bool {
    if let Some(deep_link) = extract_deep_link_arg(args) {
        emit_deep_link(app, deep_link);
        return true;
    }

    if let Some(command_id) = extract_run_command_arg(args) {
        if startup {
            hotkeys::dispatch_hotkey_command_startup(app, command_id);
        } else {
            hotkeys::dispatch_hotkey_command(app, command_id, "cli");
        }
        return true;
    }

    if args.iter().any(|arg| arg == "--toggle") {
        toggle_launcher(app);
        return true;
    }

    false
}

#[cfg(target_os = "linux")]
fn desktop_exec_value(path: &Path) -> String {
    let escaped = path
        .display()
        .to_string()
        .replace('\\', "\\\\")
        .replace('"', "\\\"");
    format!("\"{escaped}\"")
}

#[cfg(target_os = "linux")]
fn maybe_register_dev_scheme_handlers() {
    if !cfg!(debug_assertions) {
        return;
    }

    let Some(home_dir) = std::env::var_os("HOME") else {
        return;
    };

    let applications_dir = PathBuf::from(home_dir)
        .join(".local")
        .join("share")
        .join("applications");
    if fs::create_dir_all(&applications_dir).is_err() {
        return;
    }

    let Ok(executable_path) = std::env::current_exe() else {
        return;
    };

    let desktop_id = "beam-dev-url-handler.desktop";
    let desktop_file = applications_dir.join(desktop_id);
    let desktop_entry = format!(
        "[Desktop Entry]\nType=Application\nName=Beam Dev URL Handler\nExec={} %u\nTerminal=false\nNoDisplay=true\nMimeType=x-scheme-handler/beam;x-scheme-handler/raycast;\n",
        desktop_exec_value(&executable_path)
    );

    let should_write = fs::read_to_string(&desktop_file)
        .map(|existing| existing != desktop_entry)
        .unwrap_or(true);
    if should_write && fs::write(&desktop_file, desktop_entry).is_err() {
        return;
    }

    for scheme in ["beam", "raycast"] {
        let _ = Command::new("xdg-mime")
            .args(["default", desktop_id, &format!("x-scheme-handler/{scheme}")])
            .output();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn entry() -> i32 {
    let raw_args: Vec<String> = std::env::args().collect();
    let invocation = match cli::parse_invocation(&raw_args) {
        Ok(invocation) => invocation,
        Err(error) => {
            eprintln!("beam: {error}");
            return 2;
        }
    };

    match invocation {
        cli::CliInvocation::LaunchApp { startup_args } => {
            run(startup_args);
            0
        }
        cli::CliInvocation::RunWaylandDataControlHelper => {
            match linux_desktop::wayland_helper::run_helper_main() {
                Ok(()) => 0,
                Err(error) => {
                    eprintln!("beam: {error}");
                    2
                }
            }
        }
        cli::CliInvocation::Dmenu { options } => match cli::execute_dmenu(options) {
            Ok(code) => code,
            Err(error) => {
                eprintln!("beam: {error}");
                2
            }
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(startup_args: Vec<String>) {
    let mut builder = tauri::Builder::default()
        .manage(state::AppState::new())
        .manage(extensions::runtime::bridge::ExtensionRuntimeBridgeState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = launcher_window::hide_main_launcher_window(&window.app_handle());
            }
        })
        .invoke_handler(app_commands::get_handler());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !handle_activation_args(app, &args, false) {
                let _ = launcher_window::reveal_launcher_window(app);
            }
        }));
    }

    builder
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .filter(|metadata| {
                            let target = metadata.target();
                            !target.starts_with("zbus")
                                && !target.starts_with("tracing")
                                && !target.starts_with("rig")
                        })
                        .build(),
                )?;
            }

            #[cfg(target_os = "linux")]
            maybe_register_dev_scheme_handlers();

            #[cfg(target_os = "linux")]
            launcher_window::configure_linux_launcher_surface(&app.handle());

            #[cfg(target_os = "linux")]
            if linux_desktop::environment::detect_environment().desktop_environment == "gnome" {
                let _ =
                    linux_desktop::gnome_extension::install::refresh_installed_extension_if_needed(
                    );
            }

            if let Err(error) = calculator::initialize(&app.handle()) {
                log::warn!("failed to initialize soulver calculator: {error}");
            }
            calculator::db::init(&app.handle());
            clipboard::db::init(&app.handle());
            clipboard::start_clipboard_listener(app.handle().clone());

            match settings::get_ui_layout_mode(app.handle().clone()) {
                Ok(layout_mode) => {
                    let compact = matches!(layout_mode, UiLayoutMode::Compressed);
                    let _ = launcher_window::set_launcher_compact_mode(
                        app.handle().clone(),
                        compact,
                        None,
                    );
                }
                Err(error) => {
                    log::warn!("failed to load ui layout mode: {error}");
                }
            }

            #[cfg(desktop)]
            {
                let _ = handle_activation_args(&app.handle(), &startup_args, true);
            }

            // Initialize File Search Backend via State
            state::init(&app.handle())
                .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;
            danksearch::initialize(app.handle().clone());
            applications::cache::initialize_backend(app.handle().clone());

            hotkeys::initialize_hotkey_backend(&app.handle());
            ai::db::init(&app.handle());
            notes::db::init(&app.handle());
            todo::db::init(&app.handle());
            snippets::db::init(&app.handle());
            snippets::runtime::initialize_runtime(app.handle().clone());
            focus::initialize(app.handle().clone());
            extensions::browser_extension::start_bridge_server(&app.handle());
            cli::bridge::start_cli_bridge_server(&app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
