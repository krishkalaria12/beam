//! Glass mode detection (plan §04): resolve once at boot into Frosted or
//! Solid; every surface token derives from the result. Two of three platforms
//! are compile-time constants — only Linux probes.
//!
//! - macOS  → always Frosted (`Blurred` maps to NSVisualEffectView).
//! - Windows → always Solid (decision D9: Mica and DWM blur-behind unused on
//!   every version; one code path, no OS-version detection).
//! - Linux  → Frosted on blur-capable compositors (Hyprland, KWin), Solid on
//!   GNOME/Mutter and X11 without compositor blur.
//! - `BEAM_GLASS=off` forces Solid anywhere, for screenshots and users who
//!   want it.

use gpui::WindowBackgroundAppearance;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GlassMode {
    /// Compositor-blurred backdrop under a low-alpha plate.
    Frosted,
    /// No blur; a high-alpha plate carries the surface.
    Solid,
}

/// Plate alpha bases from the design's glass ladder (§04 swatches). The
/// "Glass strength" setting scales these (SD-4, store key
/// `launcher_opacity`, clamped 0.25–0.95).
pub const FROSTED_PLATE_ALPHA: f32 = 0.36;
pub const SOLID_PLATE_ALPHA: f32 = 0.88;

impl GlassMode {
    pub fn detect() -> Self {
        if std::env::var("BEAM_GLASS")
            .map(|value| value.eq_ignore_ascii_case("off"))
            .unwrap_or(false)
        {
            return Self::Solid;
        }

        if cfg!(target_os = "macos") {
            Self::Frosted
        } else if cfg!(target_os = "windows") {
            Self::Solid
        } else {
            Self::detect_linux()
        }
    }

    /// Linux probe: Hyprland exports HYPRLAND_INSTANCE_SIGNATURE; KWin on
    /// Wayland blurs layer surfaces too. Everything else — GNOME/Mutter,
    /// bare X11 — takes Solid until a blur advertisement can be probed via
    /// the desktop facade (lane A5 refines using desktop::status reporting).
    fn detect_linux() -> Self {
        if std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some() {
            return Self::Frosted;
        }

        let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default();
        let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
        let is_kwin_wayland =
            session == "wayland" && (desktop.contains("KDE") || desktop.contains("plasma"));
        if is_kwin_wayland {
            return Self::Frosted;
        }

        Self::Solid
    }

    /// The window background appearance requested for this mode. The plate
    /// itself is painted by the root view at [`Self::plate_alpha`]; the
    /// window stays `Transparent` in the Solid case so the .88 plate keeps
    /// its slight see-through, matching the removed `.sc-solid` behaviour.
    pub fn background_appearance(self) -> WindowBackgroundAppearance {
        match self {
            Self::Frosted => WindowBackgroundAppearance::Blurred,
            Self::Solid => WindowBackgroundAppearance::Transparent,
        }
    }

    /// Final plate alpha for the current glass-strength setting.
    pub fn plate_alpha(self, glass_strength: f32) -> f32 {
        let base = match self {
            Self::Frosted => FROSTED_PLATE_ALPHA,
            Self::Solid => SOLID_PLATE_ALPHA,
        };
        base * glass_strength.clamp(0.25, 0.95)
    }
}

/// Reads the glass-strength setting (SD-4). Same store key the React build
/// used for `--beam-launcher-opacity`; missing values fall back to the
/// settings default (0.96) clamped into the slider range.
pub fn glass_strength_from_store(value: Option<f64>) -> f32 {
    const SETTINGS_DEFAULT_OPACITY: f64 = 0.96;

    value
        .filter(|strength| strength.is_finite())
        .unwrap_or(SETTINGS_DEFAULT_OPACITY)
        .clamp(0.25, 0.95) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plate_alpha_stays_within_the_ladder() {
        let frosted = GlassMode::Frosted.plate_alpha(1.0);
        assert!((frosted - 0.36 * 0.95).abs() < 1e-6);

        let solid_min = GlassMode::Solid.plate_alpha(0.1);
        assert!((solid_min - 0.88 * 0.25).abs() < 1e-6);
    }

    #[test]
    fn strength_falls_back_to_the_settings_default_clamped() {
        assert!((glass_strength_from_store(None) - 0.95).abs() < 1e-6);
        assert!((glass_strength_from_store(Some(f64::NAN)) - 0.95).abs() < 1e-6);
        assert!((glass_strength_from_store(Some(0.5)) - 0.5).abs() < 1e-6);
        assert!((glass_strength_from_store(Some(2.0)) - 0.95).abs() < 1e-6);
        assert!((glass_strength_from_store(Some(0.1)) - 0.25).abs() < 1e-6);
    }

    #[test]
    fn detection_is_total_on_every_host() {
        // Must never panic regardless of environment.
        let _ = GlassMode::detect();
    }
}
