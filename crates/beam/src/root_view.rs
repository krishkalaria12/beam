//! The G0 root view: the fixed glass plate itself.
//!
//! This is the one surface from §04 — a rounded translucent plate over the
//! window background, ink on top, no shadows on the fill, a 1px inset edge
//! for elevation. It reads `launcher_opacity` out of the user's existing
//! store file, which is the G0 gate check for data continuity. The real
//! launcher shell replaces this at G1 (lane B).

use gpui::{div, prelude::*, px, rgba, Context, Window};

use crate::glass::GlassMode;

pub struct RootView {
    glass_mode: GlassMode,
    plate_alpha: f32,
}

impl RootView {
    pub fn new(glass_mode: GlassMode, glass_strength: f32) -> Self {
        Self {
            glass_mode,
            plate_alpha: glass_mode.plate_alpha(glass_strength),
        }
    }
}

/// Ink colours from the design (§04): white text, dimmed secondary.
const INK: u32 = 0xe8ebf2;
const INK_DIM: u32 = 0x8a90a0;
const EDGE_ALPHA: f32 = 0.14;

fn with_alpha(rgb_hex: u32, alpha: f32) -> u32 {
    let clamped = (alpha.clamp(0.0, 1.0) * 255.0).round() as u32;
    (rgb_hex << 8) | clamped
}

impl Render for RootView {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let mode_label = match self.glass_mode {
            GlassMode::Frosted => "frosted",
            GlassMode::Solid => "solid",
        };

        div()
            .size_full()
            .flex()
            .flex_col()
            .items_center()
            .justify_center()
            .bg(rgba(with_alpha(0x0a0b0e, self.plate_alpha)))
            .rounded(px(16.))
            .border_1()
            .border_color(rgba(with_alpha(0xffffff, EDGE_ALPHA)))
            .child(
                div()
                    .text_size(px(20.))
                    .text_color(rgba(with_alpha(INK, 1.0)))
                    .font_weight(gpui::FontWeight::MEDIUM)
                    .child("Beam"),
            )
            .child(
                div()
                    .mt_2()
                    .text_size(px(12.))
                    .text_color(rgba(with_alpha(INK_DIM, 1.0)))
                    .child(format!(
                        "GPUI port · G0 · glass {mode_label} · plate α {:.2}",
                        self.plate_alpha
                    )),
            )
    }
}
