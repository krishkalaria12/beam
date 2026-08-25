//! Beam's theme mapping onto gpui-component (lane B).
//!
//! The design system is one fixed dark glass surface (plan §04): the
//! semantic slots of gpui-component's `ThemeColor` are filled from the beam
//! tokens so every library component (inputs, lists, menus, popovers) reads
//! as ink-on-glass without per-component overrides. Two values per role —
//! washes at low alpha, never new opaque fills.

use gpui::{px, Hsla, Pixels};
use gpui_component::{theme::Theme, ThemeColor, ThemeMode};

use beam_ui::tokens;

fn hex_alpha(hex: u32, alpha: f32) -> Hsla {
    let clamped = (alpha.clamp(0.0, 1.0) * 255.0).round() as u32;
    gpui::rgba((hex << 8) | clamped).into()
}

fn hex(hex: u32) -> Hsla {
    hex_alpha(hex, 1.0)
}

/// Installs gpui-component and bends its theme to the beam glass surface.
/// Call once at startup, before any window opens.
pub fn init(cx: &mut gpui::App) {
    gpui_component::init(cx);
    Theme::change(ThemeMode::Dark, None, cx);

    let theme = Theme::global_mut(cx);
    apply_beam_tokens(&mut theme.colors);
    theme.radius = px(tokens::RADIUS_CONTROL);
    theme.radius_lg = px(tokens::RADIUS_ROW);
    theme.shadow = false;

    Theme::sync_base(cx);
}

fn apply_beam_tokens(color: &mut ThemeColor) {
    // The window paints its own plate; library surfaces stay transparent so
    // the glass reads through.
    color.background = gpui::transparent_black().into();
    color.foreground = hex(tokens::INK);

    // Wash ladder.
    color.accent = hex(tokens::ACCENT);
    color.accent_foreground = hex(0x0a0b0e);
    color.primary = hex(tokens::ACCENT);
    color.primary_hover = hex_alpha(tokens::ACCENT, 0.85);
    color.primary_foreground = hex(0x0a0b0e);
    color.ring = hex_alpha(tokens::ACCENT, 0.55);
    color.caret = hex(tokens::ACCENT);
    color.selection = hex_alpha(tokens::ACCENT, 0.25);

    // Interaction washes — white at low alpha, never new fills.
    color.list = gpui::transparent_black().into();
    color.list_hover = hex_alpha(0xffffff, tokens::ROW_HOVER_ALPHA);
    color.list_active = hex_alpha(0xffffff, tokens::ROW_SELECTED_ALPHA);
    color.list_active_border = hex_alpha(0xffffff, tokens::SELECTED_EDGE_ALPHA);
    color.secondary = hex_alpha(0xffffff, tokens::ROW_HOVER_ALPHA);
    color.secondary_hover = hex_alpha(0xffffff, tokens::ROW_SELECTED_ALPHA);
    color.secondary_foreground = hex(tokens::INK);
    color.input = hex_alpha(0xffffff, tokens::ROW_HOVER_ALPHA);
    color.popover = hex_alpha(0x0a0b0e, tokens::SOLID_PLATE_ALPHA);
    color.popover_foreground = hex(tokens::INK);

    // Lines — dividers at .08, borders at .14, no third value.
    color.border = hex_alpha(0xffffff, tokens::BORDER_ALPHA);

    // Ink roles.
    color.muted = hex_alpha(0xffffff, tokens::ROW_HOVER_ALPHA);
    color.muted_foreground = hex(tokens::INK_DIM);
    color.description_list_label_foreground = hex(tokens::INK_FAINT);
}

/// The plate radius for the launcher shell.
pub fn shell_radius() -> Pixels {
    px(tokens::RADIUS_SHELL)
}
