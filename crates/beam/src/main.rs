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
mod app;
mod command_registry;
mod glass;
mod hotkey;
mod root_view;
mod window;

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

fn run_first_instance(args: &[String]) -> i32 {
    // The gpui run closure is 'static; own the startup arguments.
    let args: Vec<String> = args.to_vec();
    gpui_platform::application().run(move |cx: &mut App| {
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

        // Design-system key maps (TextInput actions, scoped to its context)
        // and the shell's list navigation.
        beam_ui::input::init(cx);
        root_view::init(cx);

        // Activation surface: serve the socket and drain it into the app.
        let (sender, receiver) = unbounded::<activation::ActivationRequest>();
        if let Err(error) = activation::serve(sender.clone()) {
            log::warn!("activation server did not start: {error}");
        }

        cx.spawn(async move |cx| {
            while let Ok(request) = receiver.recv().await {
                let _ = cx.update(|cx| {
                    app::global(cx).update(cx, |app, cx| app.handle_activation(request.clone(), cx))
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
