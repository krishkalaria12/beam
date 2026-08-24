//! Design tokens — the glass ladder, ink colours, type scale and wash rules
//! from migration plan §04. Transcribed constants (rule R2): every number
//! here is read out of the design or the React app's CSS, not estimated.
//!
//! Rules that keep glass legible:
//! - No drop shadows on translucent fills; a 1px inset edge for elevation.
//! - Wash, don't fill: interaction states are white at low alpha.
//! - Dividers at .08, borders at .14 — two values, no third.

use gpui::Hsla;

/// `shell.plate` — the launcher window over compositor blur (radius 16).
pub const FROSTED_PLATE_ALPHA: f32 = 0.36;
/// `shell.plate.solid` — fallback when the compositor has no blur.
pub const SOLID_PLATE_ALPHA: f32 = 0.88;
/// `footer.plate` — the 42px footer bar, darkened over the shell plate.
pub const FOOTER_PLATE_ALPHA: f32 = 0.18;

/// `accent` — focus rings, active tab underline, primary action text.
/// Nothing else.
pub const ACCENT: u32 = 0x8fb4ff;

/// Ink.
pub const INK: u32 = 0xe8ebf2;
pub const INK_DIM: u32 = 0x8a90a0;
pub const INK_FAINT: u32 = 0x5d6373;

/// Washes (white at low alpha — never a new opaque colour).
pub const ROW_HOVER_ALPHA: f32 = 0.06;
pub const ROW_SELECTED_ALPHA: f32 = 0.10;
pub const SELECTED_EDGE_ALPHA: f32 = 0.14;
pub const DIVIDER_ALPHA: f32 = 0.08;
pub const BORDER_ALPHA: f32 = 0.14;

/// Radii.
pub const RADIUS_SHELL: f32 = 16.0;
pub const RADIUS_ROW: f32 = 10.0;
pub const RADIUS_CONTROL: f32 = 8.0;

/// The type scale, carried over verbatim from `tokens.css` (13px base with
/// fixed ratios). Values in px at the 13px base.
pub const TEXT_2XS: f32 = 10.0; // footer labels, kbd hints
pub const TEXT_XS: f32 = 11.0; // section headers, accessories
pub const TEXT_SM: f32 = 12.0; // row subtitles
pub const TEXT_MD: f32 = 13.0; // body
pub const TEXT_LG: f32 = 14.0; // panel titles
pub const TEXT_XL: f32 = 15.0; // emphasis
pub const TEXT_2XL: f32 = 16.0; // detail headings
pub const TEXT_3XL: f32 = 18.0; // command row titles
pub const TEXT_DISPLAY: f32 = 20.0; // search input, calculator result

/// Heights transcribed from the source components.
pub const FOOTER_HEIGHT: f32 = 42.0;
pub const SEARCH_BAR_HEIGHT: f32 = 56.0;
pub const KBD_MIN_WIDTH: f32 = 22.0;
pub const KBD_HEIGHT: f32 = 22.0;

pub fn hex(hex: u32) -> Hsla {
    gpui::rgba((hex << 8) | 0xff).into()
}

pub fn hex_alpha(hex: u32, alpha: f32) -> Hsla {
    let clamped = (alpha.clamp(0.0, 1.0) * 255.0).round() as u32;
    gpui::rgba((hex << 8) | clamped).into()
}

/// `row.hover`
pub fn row_hover() -> Hsla {
    hex_alpha(0xffffff, ROW_HOVER_ALPHA)
}

/// `row.selected` fill (the inset edge is painted separately by the row).
pub fn row_selected() -> Hsla {
    hex_alpha(0xffffff, ROW_SELECTED_ALPHA)
}

pub fn divider() -> Hsla {
    hex_alpha(0xffffff, DIVIDER_ALPHA)
}

pub fn border() -> Hsla {
    hex_alpha(0xffffff, BORDER_ALPHA)
}

pub fn accent() -> Hsla {
    hex(ACCENT)
}

pub fn ink() -> Hsla {
    hex(INK)
}

pub fn ink_dim() -> Hsla {
    hex(INK_DIM)
}

pub fn ink_faint() -> Hsla {
    hex(INK_FAINT)
}

/// The shell plate for a given glass mode and strength.
pub fn shell_plate(frosted: bool, glass_strength: f32) -> Hsla {
    let base = if frosted {
        FROSTED_PLATE_ALPHA
    } else {
        SOLID_PLATE_ALPHA
    };
    hex_alpha(0x0a0b0e, base * glass_strength.clamp(0.25, 0.95))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn type_scale_matches_tokens_css() {
        assert_eq!(TEXT_2XS, 10.0);
        assert_eq!(TEXT_XS, 11.0);
        assert_eq!(TEXT_SM, 12.0);
        assert_eq!(TEXT_MD, 13.0);
        assert_eq!(TEXT_LG, 14.0);
        assert_eq!(TEXT_XL, 15.0);
        assert_eq!(TEXT_2XL, 16.0);
        assert_eq!(TEXT_3XL, 18.0);
        assert_eq!(TEXT_DISPLAY, 20.0);
    }

    #[test]
    fn washes_stay_below_the_two_value_rule() {
        // Dividers and borders are exactly the two sanctioned alphas.
        assert_eq!(DIVIDER_ALPHA, 0.08);
        assert_eq!(BORDER_ALPHA, 0.14);
        assert_eq!(ROW_HOVER_ALPHA, 0.06);
        assert_eq!(ROW_SELECTED_ALPHA, 0.10);
        assert_eq!(SELECTED_EDGE_ALPHA, 0.14);
    }

    #[test]
    fn plate_alpha_clamps_to_the_glass_strength_slider() {
        let alpha = shell_plate(true, 2.0);
        // 0.36 * 0.95 — the SD-4 clamp. Tolerance covers the rgba→Hsla
        // conversion rounding.
        assert!((alpha.a - 0.36 * 0.95).abs() < 0.002, "{}", alpha.a);
    }
}
