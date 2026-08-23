//! Non-Linux placeholder for the Soulver FFI.
//!
//! The vendored Swift wrapper (`SoulverWrapper`) is only compiled on Linux;
//! keeping this stub lets the calculator module compile everywhere while
//! `evaluate_with_soulver` short-circuits into the smart-calculator fallback.

/// Intentionally unused outside Linux; present so the module is non-empty and
/// any accidental reference fails loudly with a clear name.
#[allow(dead_code)]
pub const PLATFORM_UNSUPPORTED: &str = "soulver engine is unavailable on this platform";
