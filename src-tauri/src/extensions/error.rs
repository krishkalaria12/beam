use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ExtensionError>;

#[derive(Debug, Error)]
pub enum ExtensionError {
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

impl From<std::io::Error> for ExtensionError {
    fn from(error: std::io::Error) -> Self {
        ExtensionError::Io(error.to_string())
    }
}

impl From<reqwest::Error> for ExtensionError {
    fn from(error: reqwest::Error) -> Self {
        ExtensionError::Network(error.to_string())
    }
}

impl From<serde_json::Error> for ExtensionError {
    fn from(error: serde_json::Error) -> Self {
        ExtensionError::Parse(error.to_string())
    }
}

impl From<zip::result::ZipError> for ExtensionError {
    fn from(error: zip::result::ZipError) -> Self {
        ExtensionError::Archive(error.to_string())
    }
}

impl From<keyring::Error> for ExtensionError {
    fn from(error: keyring::Error) -> Self {
        ExtensionError::Keyring(error.to_string())
    }
}

impl Serialize for ExtensionError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
