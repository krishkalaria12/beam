use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ExtensionsError>;

#[derive(Debug, Error)]
pub enum ExtensionsError {
    #[error("Invalid extension slug: {0}")]
    InvalidSlug(String),

    #[error("Failed to resolve app data directory")]
    AppDataDirUnavailable,

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Archive error: {0}")]
    Archive(String),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Keyring error: {0}")]
    Keyring(String),

    #[error("AI access is disabled or API key is missing")]
    AiAccessDisabled,

    #[error("Browser extension bridge is not connected (method: {0})")]
    BrowserExtensionUnavailable(String),

    #[error("{0}")]
    Message(String),
}

impl From<std::io::Error> for ExtensionsError {
    fn from(error: std::io::Error) -> Self {
        ExtensionsError::Io(error.to_string())
    }
}

impl From<reqwest::Error> for ExtensionsError {
    fn from(error: reqwest::Error) -> Self {
        ExtensionsError::Network(error.to_string())
    }
}

impl From<serde_json::Error> for ExtensionsError {
    fn from(error: serde_json::Error) -> Self {
        ExtensionsError::Parse(error.to_string())
    }
}

impl From<zip::result::ZipError> for ExtensionsError {
    fn from(error: zip::result::ZipError) -> Self {
        ExtensionsError::Archive(error.to_string())
    }
}

impl From<keyring::Error> for ExtensionsError {
    fn from(error: keyring::Error) -> Self {
        ExtensionsError::Keyring(error.to_string())
    }
}

impl Serialize for ExtensionsError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
