use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, LauncherThemeError>;

#[derive(Debug, Error)]
pub enum LauncherThemeError {
    #[error("Failed to resolve app config directory: {0}")]
    AppConfigDirUnavailable(String),

    #[error("Theme directory has invalid UTF-8 name")]
    InvalidDirectoryName,

    #[error("Invalid theme folder name: {0}")]
    InvalidFolderName(String),

    #[error("Theme manifest file not found: {0}")]
    ManifestNotFound(String),

    #[error("Failed to read theme manifest: {0}")]
    ManifestRead(String),

    #[error("Failed to parse theme manifest: {0}")]
    ManifestParse(String),

    #[error("Failed to read themes directory: {0}")]
    ThemesDirectoryRead(String),

    #[error("Theme stylesheet not found: {0}")]
    StylesheetNotFound(String),

    #[error("Failed to read theme stylesheet metadata: {0}")]
    StylesheetMetadata(String),

    #[error("Theme stylesheet exceeds maximum size of {0} bytes")]
    StylesheetTooLarge(usize),

    #[error("Failed to read theme stylesheet: {0}")]
    StylesheetRead(String),

    #[error("Failed to open settings store: {0}")]
    StoreUnavailable(String),

    #[error("Failed to save settings store: {0}")]
    StoreSave(String),

    #[error("Invalid theme id: {0}")]
    InvalidThemeId(String),

    #[error("Theme not found: {0}")]
    ThemeNotFound(String),
}

impl From<std::io::Error> for LauncherThemeError {
    fn from(error: std::io::Error) -> Self {
        Self::StylesheetRead(error.to_string())
    }
}

impl From<serde_json::Error> for LauncherThemeError {
    fn from(error: serde_json::Error) -> Self {
        Self::ManifestParse(error.to_string())
    }
}

impl Serialize for LauncherThemeError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
