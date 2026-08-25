//! beam — the GPUI launcher binary.
//!
//! G0 scope (plan §06): a window that opens on the global hotkey, paints the
//! glass plate, reads a value out of the existing on-disk store, and honours
//! the activation surface (`--toggle`, `--run-command`, deep links) through
//! the single-instance socket.
//!
//! PORT markers begin at G1 when the service and UI ports start; the audit
//! script keys off them from then on.

mod activation;
mod ai_panel;
mod app;
mod calculator_history_panel;
mod calculator_inline;
mod clipboard_panel;
mod command_registry;
mod dictionary_panel;
mod dmenu_panel;
mod emoji_panel;
mod extension_runtime_shell;
mod extensions_panel;
mod file_search_panel;
mod focus_panel;
mod glass;
mod hotkey;
mod hyprwhspr_panel;
mod launcher_state;
mod notes_panel;
mod panel_router;
mod quicklinks_panel;
mod root_view;
mod script_commands_panel;
mod settings_panel;
mod snippets_panel;
mod speed_test_panel;
mod theme;
mod todo_panel;
mod translation_panel;
mod window;
mod window_switcher_panel;

use async_channel::unbounded;
use gpui::{actions, App, KeyBinding};

const LOG_FILTER_ENV: &str = "BEAM_LOG";

actions!(beam, [HideLauncher]);

fn init_logging() {
    let filter = std::env::var(LOG_FILTER_ENV)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(log::LevelFilter::Info);
    env_logger::Builder::new()
        .filter_level(filter)
        .format_timestamp(None)
        .init();
}

/// Extracts the activation arguments the Tauri build recognised
/// (transcribed from `lib.rs::handle_activation_args`).
fn extract_activation_args(args: &[String]) -> Option<activation::ActivationRequest> {
    let relevant: Vec<String> = args
        .iter()
        .filter(|arg| {
            let arg = arg.as_str();
            arg == "--toggle"
                || arg.starts_with("--run-command=")
                || arg.starts_with("beam://")
                || arg.starts_with("raycast://")
                || arg.starts_with("https://raycast.com/redirect")
                || arg.starts_with("http://raycast.com/redirect")
        })
        .cloned()
        .collect();

    (!relevant.is_empty()).then(|| activation::ActivationRequest { args: relevant })
}

/// Starts every background service the old Tauri setup hook started.
/// The UI hooks (hotkey toggle/reveal, CLI bridge reveal) are installed
/// here because they own the window.
fn services_bootstrap(cx: &mut App, context: beam_core::BeamContext) {
    use beam_services::state::AppState;

    let state = std::sync::Arc::new(AppState::new());
    let snippets_state = state.snippets.clone();

    // UI hooks first: the hotkey runtime and the CLI bridge need them.
    let (hotkey_tx, hotkey_rx) = async_channel::unbounded::<crate::activation::ActivationRequest>();
    let toggle_tx = hotkey_tx.clone();
    beam_services::hotkeys::install_ui_hooks(beam_services::hotkeys::HotkeyUiHooks {
        toggle_launcher: std::sync::Arc::new(move || {
            let _ = toggle_tx.send_blocking(crate::activation::ActivationRequest::from_args(&[
                "--toggle".into(),
            ]));
        }),
        show_launcher: std::sync::Arc::new(move || {
            let _ = hotkey_tx.send_blocking(crate::activation::ActivationRequest::from_args(&[
                "--toggle".into(),
            ]));
        }),
    });

    // Soulver calculator (Linux FFI; no-op elsewhere), then its db.
    if let Err(error) = beam_services::calculator::initialize(&context) {
        log::warn!("failed to initialize soulver calculator: {error}");
    }
    beam_services::calculator::db::init(&context);
    beam_services::clipboard::db::init(&context);

    // Clipboard history listener (polls the pasteboard).
    beam_services::clipboard::start_clipboard_listener(&context);

    // File search backend + applications cache + dsearch bootstrap.
    beam_services::state::init(&state);
    beam_services::danksearch::initialize(&context);
    beam_services::applications::cache::initialize_backend(&context);

    // Hotkeys: the launcher toggle is the critical path.
    beam_services::hotkeys::initialize_hotkey_backend(&context);

    beam_services::ai::db::init(&context);
    beam_services::notes::db::init(&context);
    beam_services::todo::db::init(&context);
    beam_services::snippets::db::init(&context);
    beam_services::snippets::runtime::initialize_runtime(&context, snippets_state);
    beam_services::focus::initialize(&context, state.clone());
    beam_services::extensions::browser_extension::start_bridge_server(&context);
    beam_services::cli::bridge::start_cli_bridge_server(&context, state.cli_bridge.clone());

    // Drain the UI-hook activation requests into the app (same channel the
    // activation socket and the global hotkey feed).
    let app_handle = app::global(cx);
    cx.spawn(async move |cx| {
        while let Ok(request) = hotkey_rx.recv().await {
            let _ = cx.update(|cx| {
                app::global(cx).update(cx, |app, cx| app.handle_activation(request.clone(), cx))
            });
        }
        let _ = app_handle;
    })
    .detach();
}

fn run_first_instance(args: &[String]) -> i32 {
    // The gpui run closure is 'static; own the startup arguments.
    let args: Vec<String> = args.to_vec();
    gpui_platform::application()
        .with_assets(gpui_component_assets::Assets)
        .run(move |cx: &mut App| {
            cx.bind_keys([KeyBinding::new("escape", HideLauncher, None)]);
            cx.on_action(|_: &HideLauncher, cx| {
                app::with_app(cx, |app, cx| app.hide(cx));
            });

            let context = match beam_core::BeamContext::open() {
                Ok(context) => context,
                Err(error) => {
                    log::error!("fatal: could not open beam context: {error}");
                    return;
                }
            };

            let app = app::init(cx, context);

            // Component library first (registers its key maps, roots and
            // popovers), then the beam theme mapping over it.
            theme::init(cx);

            // The shell's list navigation.
            root_view::init(cx);

            // Activation surface: serve the socket and drain it into the app.
            let (sender, receiver) = unbounded::<activation::ActivationRequest>();
            if let Err(error) = activation::serve(sender.clone()) {
                log::warn!("activation server did not start: {error}");
            }

            cx.spawn(async move |cx| {
                while let Ok(request) = receiver.recv().await {
                    let _ = cx.update(|cx| {
                        app::global(cx)
                            .update(cx, |app, cx| app.handle_activation(request.clone(), cx))
                    });
                }
            })
            .detach();

            #[cfg(target_os = "macos")]
            {
                let stored_shortcut: Option<String> = app.read_with(cx, |app, _| {
                    app.context
                        .settings()
                        .get("hotkey_global_shortcut")
                        .and_then(|value| value.as_str().map(str::to_string))
                });
                let shortcut = stored_shortcut.unwrap_or_else(|| "SUPER+R".to_string());

                if let Err(error) = hotkey::macos::install_launcher_toggle(&shortcut, sender) {
                    log::warn!("{error}");
                }
            }

            // Startup arguments behave like the Tauri build's startup activation:
            // an explicit request runs immediately, otherwise stay hidden until
            // summoned by hotkey or deep link.
            if let Some(request) = extract_activation_args(&args) {
                app.update(cx, |app, cx| app.handle_activation(request, cx));
            } else {
                // Pre-open the window so the first hotkey press reveals an
                // already-built surface instead of paying cold window setup.
                app.update(cx, |app, cx| app.ensure_window(cx));
            }
        });

    0
}

fn main() -> std::process::ExitCode {
    init_logging();
    let args: Vec<String> = std::env::args().skip(1).collect();

    // Second instances forward to the running one and exit immediately.
    if let Some(request) = extract_activation_args(&args) {
        match activation::try_forward(&request) {
            Ok(true) => return std::process::ExitCode::SUCCESS,
            Ok(false) => {} // nobody home — we become the first instance
            Err(error) => log::warn!("activation forward failed: {error}"),
        }
    }

    let code = run_first_instance(&args);
    std::process::ExitCode::from(code as u8)
}
