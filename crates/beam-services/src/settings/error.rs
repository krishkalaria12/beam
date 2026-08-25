// PORT: apps/desktop/src-tauri/src/settings/error.rs
// Copied verbatim; no Tauri APIs in this file.
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SettingsError>;

#[derive(Debug, Clone, Error)]
pub enum SettingsError {
    #[error("failed to open settings store: {0}")]
    StoreOpen(String),

    #[error("failed to save settings store: {0}")]
    StoreSave(String),

    #[error("invalid launcher opacity")]
    InvalidLauncherOpacity,

    #[error("invalid icon theme")]
    InvalidIconTheme,

    #[error("invalid launcher font family")]
    InvalidLauncherFontFamily,

    #[error("invalid launcher font size")]
    InvalidLauncherFontSize,

    #[error("invalid ui style")]
    InvalidUiStyle,

    #[error("invalid base color")]
    InvalidBaseColor,

    #[error("invalid trigger symbols")]
    InvalidTriggerSymbols,
}

impl From<beam_core::BeamError> for SettingsError {
    fn from(error: beam_core::BeamError) -> Self {
        Self::StoreSave(error.to_string())
    }
}

impl Serialize for SettingsError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
