//! The beam application state: the launcher window handle, visibility and
//! the glass configuration, held as a gpui entity so the hotkey thread,
//! activation socket and key bindings all converge on one toggle.

use gpui::{App, AppContext as _, Entity};
use gpui_component::Root;

use crate::activation::ActivationRequest;
use crate::glass::GlassMode;
use crate::window::{open_launcher_window, LauncherShellConfig, PanelSurface};
use beam_core::BeamContext;

/// Typed handle to the shell view, stashed where show() can reach it
/// (the window handle is Root-typed; the input focus lives in the shell).
static BEAM_SHELL: std::sync::OnceLock<gpui::Entity<crate::root_view::RootView>> =
    std::sync::OnceLock::new();

pub fn init(cx: &mut App, context: BeamContext) -> Entity<BeamApp> {
    // Glass detection + the store read happen once at boot; reading
    // `launcher_opacity` out of the user's existing settings.json is the G0
    // gate check for data continuity.
    let glass_mode = GlassMode::detect();
    let stored_strength = context
        .settings()
        .get("launcher_opacity")
        .and_then(|value| {
            value
                .as_f64()
                .or_else(|| value.as_str().and_then(|s| s.parse().ok()))
        });
    let glass_strength = crate::glass::glass_strength_from_store(stored_strength);

    let app = cx.new(|_| BeamApp {
        context,
        glass_mode,
        glass_strength,
        window: None,
        shell: None,
        visible: false,
    });
    cx.set_global(GlobalApp(app.clone()));
    app
}

/// The global handle so actions and background bridges can reach the state.
pub struct GlobalApp(pub Entity<BeamApp>);

impl gpui::Global for GlobalApp {}

pub fn global(cx: &App) -> Entity<BeamApp> {
    cx.global::<GlobalApp>().0.clone()
}

pub struct BeamApp {
    pub context: BeamContext,
    pub glass_mode: GlassMode,
    /// Glass strength from the settings store (SD-4); read by the theme
    /// plate and the settings surface.
    #[allow(dead_code)]
    pub glass_strength: f32,
    window: Option<gpui::WindowHandle<Root>>,
    /// Typed handle to the shell inside the Root, for focusing the input.
    shell: Option<gpui::Entity<crate::root_view::RootView>>,
    visible: bool,
}

impl BeamApp {
    pub fn shell_config(&self) -> LauncherShellConfig {
        LauncherShellConfig::new(self.glass_mode)
    }

    /// Opens the launcher window without revealing it; `show` performs the
    /// first reveal.
    pub fn ensure_window(&mut self, cx: &mut App) {
        if self.window.is_some() {
            return;
        }

        let config = self.shell_config();
        let glass_label = match self.glass_mode {
            crate::glass::GlassMode::Frosted => "frosted",
            crate::glass::GlassMode::Solid => "solid",
        };
        let context = self.context.clone();

        match open_launcher_window(
            cx,
            config,
            PanelSurface::Commands {
                compact_height: None,
            },
            move |window, cx| {
                // gpui-component's Root must be the top-level view: it owns
                // the popover/tooltip/notification layers the library
                // components render into.
                cx.new(|cx| {
                    let shell = cx.new(|cx| {
                        crate::root_view::RootView::new(
                            glass_label.to_string(),
                            context,
                            window,
                            cx,
                        )
                    });
                    BEAM_SHELL.set(shell.clone()).ok();
                    Root::new(gpui::AnyView::from(shell), window, cx)
                })
            },
        ) {
            Ok(handle) => {
                self.window = Some(handle);
                self.shell = BEAM_SHELL.get().cloned();
                self.visible = false;

                // Closing must never quit the process — the launcher hides.
                let _ = handle.update(cx, |_, window, cx| {
                    window.on_window_should_close(cx, |_window, _cx| false);
                });
            }
            Err(error) => log::error!("could not open the launcher window: {error}"),
        }
    }

    /// Reveals and focuses the launcher. SD-2: one focus call, no retries.
    pub fn show(&mut self, cx: &mut App) {
        self.ensure_window(cx);
        let Some(handle) = self.window else {
            return;
        };

        #[cfg(target_os = "macos")]
        {
            cx.activate(true);
            let _ = handle.update(cx, |_, window, cx| {
                window.activate_window();
                if let Some(shell) = BEAM_SHELL.get() {
                    shell.update(cx, |shell, cx| shell.focus_input(window, cx));
                }
            });
            self.visible = true;
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Linux: activate/hide are upstream no-ops at the pinned rev and
            // layer-shell surfaces have no withdraw API yet (lane A5 owns a
            // protocol shim). Windows: Platform::hide() is also a no-op
            // upstream; the ShowWindow shim lands with A5b. Until then the
            // window simply stays on screen on these platforms.
            let _ = handle.update(cx, |_, window, cx| {
                window.activate_window();
                if let Some(shell) = BEAM_SHELL.get() {
                    shell.update(cx, |shell, cx| shell.focus_input(window, cx));
                }
            });
            self.visible = true;
            log::info!("show: full show/hide parity pending lane A5 on this platform");
        }
    }

    /// Hides the launcher.
    pub fn hide(&mut self, cx: &mut App) {
        let was_visible = self.visible;
        self.visible = false;

        if was_visible || cfg!(target_os = "macos") {
            #[cfg(target_os = "macos")]
            {
                cx.hide();
            }
            #[cfg(target_os = "linux")]
            {
                log::info!("hide: layer-shell withdraw pending lane A5");
            }
            #[cfg(target_os = "windows")]
            {
                log::info!("hide: ShowWindow shim pending lane A5b");
            }
        }

        // Resetting to the root panel on hide mirrors the React build's
        // `launcher-reset-to-main` behaviour.
        self.context.emit(beam_core::BeamEvent::LauncherResetToMain);
    }

    /// The single entry point every activation path converges on.
    pub fn toggle(&mut self, cx: &mut App) {
        if self.visible {
            self.hide(cx);
        } else {
            self.show(cx);
        }
    }

    /// Dispatches one activation request (from CLI args or the socket).
    pub fn handle_activation(&mut self, request: ActivationRequest, cx: &mut App) {
        for arg in &request.args {
            if arg == "--toggle" {
                self.toggle(cx);
                return;
            }
            if let Some(command_id) = arg.strip_prefix("--run-command=") {
                self.context.emit(beam_core::BeamEvent::HotkeyCommand(
                    beam_core::events::HotkeyCommand {
                        command_id: command_id.to_string(),
                        source: "cli".to_string(),
                    },
                ));
                self.show(cx);
                return;
            }
            if arg.starts_with("beam://") || arg.starts_with("raycast://") {
                self.context
                    .emit(beam_core::BeamEvent::DeepLink(arg.clone()));
                self.show(cx);
                return;
            }
        }
    }
}

/// The shared services state, reachable from any render context.
pub fn services_state() -> std::sync::Arc<beam_services::state::AppState> {
    SERVICES_STATE
        .get()
        .cloned()
        .expect("services state installed at startup")
}

static SERVICES_STATE: std::sync::OnceLock<std::sync::Arc<beam_services::state::AppState>> =
    std::sync::OnceLock::new();

/// The shared BeamContext, reachable from any render context.
pub fn context_of<V>(cx: &gpui::Context<V>) -> BeamContext {
    cx.global::<GlobalApp>().0.read(cx).context.clone()
}

/// Convenience for key bindings: run a mutation against the global app.
pub fn with_app<R>(cx: &mut App, f: impl FnOnce(&mut BeamApp, &mut App) -> R) -> Option<R> {
    let app = global(cx);
    app.update(cx, |app, cx| Some(f(app, cx)))
}
