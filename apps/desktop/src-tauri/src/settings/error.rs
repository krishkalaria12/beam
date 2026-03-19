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
}

impl Serialize for SettingsError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
