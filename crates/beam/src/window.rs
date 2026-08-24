//! The launcher window: one module owning all four surface paths so no other
//! component learns what platform it is on (plan §05, "follow the façade").
//!
//! Sizes are transcribed from `use-launcher-window-size-sync.ts` and
//! `launcher_window.rs` (SD-1 applies: direct resize, no hide/show dance;
//! SD-2 applies: single focus call).
//!
//! Spike findings recorded against the pinned GPUI rev (docs/parity/spikes.md):
//! - There is no per-window show/hide upstream. Show = `App::activate(true)`
//!   + `Window::activate_window()`; hide = `App::hide()`. macOS implements
//!   both; Linux and Windows `Platform::hide()` are upstream no-ops, so the
//!   Linux layer-shell withdraw and the Windows ShowWindow shim are owned by
//!   lane A5.
//! - Display bounds stand in for work areas until A5 lands monitor/work-area
//!   resolution behind the desktop facade; the centring arithmetic below is
//!   written so only the bounds source changes then.

use gpui::{
    px, size, App, Bounds, Entity, Pixels, Point, Render, Size, Window, WindowBounds, WindowKind,
    WindowOptions,
};

use crate::glass::GlassMode;

pub const LAUNCHER_WIDTH: f32 = 960.0;
pub const LAUNCHER_EXPANDED_HEIGHT: f32 = 520.0;
/// Compact collapse height (60px) — used by the compact-mode resize path at
/// G1.
#[allow(dead_code)]
pub const LAUNCHER_COMPACT_HEIGHT: f32 = 60.0;
pub const AI_PANEL_WIDTH: f32 = 1100.0;
pub const AI_PANEL_HEIGHT: f32 = 750.0;
pub const SETTINGS_PANEL_WIDTH: f32 = 1240.0;
pub const SETTINGS_PANEL_HEIGHT: f32 = 760.0;

/// Window sizes from `use-launcher-window-size-sync.ts`: AI and settings get
/// their own dimensions, everything else is 960×520 (compact collapse keeps
/// the width). Variants beyond `Commands` are consumed by the panel router
/// at G1 (lane B).
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum PanelSurface {
    Commands { compact_height: Option<f32> },
    Takeover { width: f32, height: f32 },
    Ai,
    Settings,
}

impl PanelSurface {
    pub fn size(self) -> Size<Pixels> {
        match self {
            Self::Commands { compact_height } => {
                let height = match compact_height {
                    Some(height) if height.is_finite() => {
                        height.clamp(44.0, LAUNCHER_EXPANDED_HEIGHT)
                    }
                    _ => LAUNCHER_EXPANDED_HEIGHT,
                };
                size(px(LAUNCHER_WIDTH), px(height))
            }
            Self::Takeover { width, height } => size(px(width), px(height)),
            Self::Ai => size(px(AI_PANEL_WIDTH), px(AI_PANEL_HEIGHT)),
            Self::Settings => size(px(SETTINGS_PANEL_WIDTH), px(SETTINGS_PANEL_HEIGHT)),
        }
    }
}

/// Everything the window needs to know about its surface, resolved at boot.
#[derive(Debug, Clone, Copy)]
pub struct LauncherShellConfig {
    pub glass_mode: GlassMode,
}

impl LauncherShellConfig {
    pub fn new(glass_mode: GlassMode) -> Self {
        Self { glass_mode }
    }

    /// Builds the platform surface options for the launcher window:
    ///
    /// - Linux/Wayland: layer shell, namespace `beam`, Overlay layer,
    ///   exclusive keyboard, anchored TOP|LEFT with centring margins — the
    ///   same maths `center_launcher_window` performs today.
    /// - Linux/X11, Windows, macOS: borderless popup-style window positioned
    ///   by centred bounds on the target display.
    pub fn window_options(
        &self,
        surface_size: Size<Pixels>,
        display_bounds: Bounds<Pixels>,
    ) -> WindowOptions {
        let base = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(centered_bounds(
                display_bounds,
                surface_size,
            ))),
            titlebar: None,
            focus: true,
            // Created unrevealed; BeamApp::show() orders it front. There is
            // no per-window hide upstream, so the window is born once and
            // toggled via activate/hide from then on.
            show: false,
            kind: WindowKind::PopUp,
            is_movable: false,
            is_resizable: false,
            display_id: None,
            window_background: self.glass_mode.background_appearance(),
            app_id: Some("io.beam.launcher".to_string()),
            ..Default::default()
        };

        #[cfg(target_os = "linux")]
        if is_wayland_session() {
            return self.layer_shell_options(surface_size, display_bounds, base);
        }

        base
    }

    /// Wayland layer-shell path. Anchored TOP|LEFT like the GTK
    /// implementation it replaces; margins centre the surface against the
    /// display bounds (work-area refinement is lane A5's, via the facade).
    #[cfg(target_os = "linux")]
    fn layer_shell_options(
        &self,
        surface_size: Size<Pixels>,
        display_bounds: Bounds<Pixels>,
        mut base: WindowOptions,
    ) -> WindowOptions {
        use gpui::layer_shell;

        let centred = centered_bounds(display_bounds, surface_size);
        let margin_top = centred.origin.y - display_bounds.origin.y;
        let margin_left = centred.origin.x - display_bounds.origin.x;

        base.kind = WindowKind::LayerShell(layer_shell::LayerShellOptions {
            namespace: "beam".to_string(),
            layer: layer_shell::Layer::Overlay,
            anchor: layer_shell::Anchor::TOP | layer_shell::Anchor::LEFT,
            exclusive_zone: None,
            exclusive_edge: None,
            keyboard_interactivity: layer_shell::KeyboardInteractivity::Exclusive,
            // CSS order per upstream docs: top, right, bottom, left.
            margin: Some((margin_top, px(0.), px(0.), margin_left)),
        });
        base
    }
}

#[cfg(target_os = "linux")]
fn is_wayland_session() -> bool {
    std::env::var_os("WAYLAND_DISPLAY").is_some() || std::env::var_os("WAYLAND_SOCKET").is_some()
}

/// Centres `surface_size` within `display_bounds`, clamped to fit — the same
/// arithmetic `center_launcher_window` applies to work areas today.
pub fn centered_bounds(
    display_bounds: Bounds<Pixels>,
    surface_size: Size<Pixels>,
) -> Bounds<Pixels> {
    let max_offset_x = (display_bounds.size.width - surface_size.width).max(px(0.));
    let max_offset_y = (display_bounds.size.height - surface_size.height).max(px(0.));

    Bounds {
        origin: Point {
            x: display_bounds.origin.x + max_offset_x * 0.5,
            y: display_bounds.origin.y + max_offset_y * 0.5,
        },
        size: surface_size,
    }
}

/// Opens the launcher window on the primary display and returns its handle.
pub fn open_launcher_window<V: Render>(
    cx: &mut App,
    config: LauncherShellConfig,
    surface: PanelSurface,
    build_root: impl FnOnce(&mut Window, &mut App) -> Entity<V>,
) -> gpui::Result<gpui::AnyWindowHandle> {
    let Some(display) = cx.displays().first().cloned() else {
        return Err(anyhow::anyhow!("no display available for the launcher window"));
    };
    let options = config.window_options(surface.size(), display.bounds());
    cx.open_window(options, build_root)
        .map(|handle| handle.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bounds(x: f32, y: f32, w: f32, h: f32) -> Bounds<Pixels> {
        Bounds {
            origin: Point { x: px(x), y: px(y) },
            size: Size {
                width: px(w),
                height: px(h),
            },
        }
    }

    #[test]
    fn panel_sizes_match_the_source_table() {
        let commands = PanelSurface::Commands { compact_height: None }.size();
        assert_eq!(commands.width, px(LAUNCHER_WIDTH));
        assert_eq!(commands.height, px(LAUNCHER_EXPANDED_HEIGHT));

        // Compact heights clamp into 44..=520 exactly as
        // set_launcher_compact_mode does.
        let compact = PanelSurface::Commands {
            compact_height: Some(30.0),
        }
        .size();
        assert_eq!(compact.height, px(44.0));

        let ai = PanelSurface::Ai.size();
        assert_eq!((ai.width, ai.height), (px(AI_PANEL_WIDTH), px(AI_PANEL_HEIGHT)));

        let settings = PanelSurface::Settings.size();
        assert_eq!(
            (settings.width, settings.height),
            (px(SETTINGS_PANEL_WIDTH), px(SETTINGS_PANEL_HEIGHT))
        );
    }

    #[test]
    fn centering_matches_the_launcher_maths() {
        let display = bounds(0., 0., 1920., 1080.);
        let window = centered_bounds(display, size(px(960.), px(520.)));
        assert_eq!(window.origin.x, px((1920. - 960.) / 2.));
        assert_eq!(window.origin.y, px((1080. - 520.) / 2.));

        // Off-origin displays keep absolute coordinates stable.
        let second_display = bounds(1920., 0., 2560., 1440.);
        let window = centered_bounds(second_display, size(px(960.), px(520.)));
        assert_eq!(window.origin.x, px(1920. + (2560. - 960.) / 2.));
        assert_eq!(window.origin.y, px((1440. - 520.) / 2.));

        // Surfaces larger than the display clamp to the origin instead of
        // going negative.
        let small = bounds(100., 100., 800., 600.);
        let window = centered_bounds(small, size(px(1200.), px(700.)));
        assert_eq!(window.origin.x, px(100.));
        assert_eq!(window.origin.y, px(100.));
    }
}
