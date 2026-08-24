//! Kbd — the keyboard-hint chip (plan §04): min-width 22, height 22, mono,
//! wash background. Modifier glyphs resolve once here, replacing the two
//! `navigator.platform` checks in the React app (action-list-panel.tsx and
//! shortcut-utils.ts). No other component learns what platform it is on.

use gpui::{div, prelude::*, px, App, IntoElement, ParentElement, Styled};

use crate::tokens;

/// The platform modifier glyph set: ⌘/⌥/⌃/⇧ on macOS, Ctrl/Alt/Shift/Win
/// elsewhere.
pub fn modifier_glyphs() -> ModifierGlyphs {
    if cfg!(target_os = "macos") {
        ModifierGlyphs {
            super_key: "⌘",
            alt: "⌥",
            ctrl: "⌃",
            shift: "⇧",
        }
    } else {
        ModifierGlyphs {
            super_key: "Win",
            alt: "Alt",
            ctrl: "Ctrl",
            shift: "Shift",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ModifierGlyphs {
    pub super_key: &'static str,
    pub alt: &'static str,
    pub ctrl: &'static str,
    pub shift: &'static str,
}

/// Renders a keystroke like `SUPER+R` or `CMD+SHIFT+P` as a row of Kbd
/// chips, using the platform glyph set.
pub fn keystroke_chips(keystroke: &str) -> impl IntoElement {
    let glyphs = modifier_glyphs();
    let tokens_normalized = keystroke
        .split('+')
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(|token| match token.to_lowercase().as_str() {
            "super" | "meta" | "command" | "cmd" | "win" | "mod4" => glyphs.super_key.to_string(),
            "alt" | "option" | "opt" | "mod1" => glyphs.alt.to_string(),
            "ctrl" | "control" => glyphs.ctrl.to_string(),
            "shift" => glyphs.shift.to_string(),
            other => other.to_string(),
        })
        .collect::<Vec<String>>();

    div()
        .flex()
        .gap_1()
        .items_center()
        .children(tokens_normalized.into_iter().map(|token| Kbd::new(token)))
}

#[derive(IntoElement)]
pub struct Kbd {
    label: String,
}

impl Kbd {
    pub fn new(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
        }
    }
}

impl RenderOnce for Kbd {
    fn render(self, _window: &mut gpui::Window, _cx: &mut App) -> impl IntoElement {
        div()
            .min_w(px(tokens::KBD_MIN_WIDTH))
            .h(px(tokens::KBD_HEIGHT))
            .px_1()
            .flex()
            .items_center()
            .justify_center()
            .rounded(px(4.))
            .bg(tokens::row_hover())
            .border_1()
            .border_color(tokens::border())
            .text_size(px(tokens::TEXT_2XS))
            .text_color(tokens::ink_dim())
            .font_family("Monaco")
            .child(self.label)
    }
}
