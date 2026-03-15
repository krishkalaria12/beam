use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, AiError>;

#[derive(Debug, Error)]
pub enum AiError {
    #[error("Unsupported AI provider: {0}")]
    UnsupportedProvider(String),

    #[error("AI access is disabled")]
    AccessDisabled,

    #[error("Failed to resolve app data directory")]
    AppDataDirUnavailable,

    #[error("Failed to create AI data directory: {0}")]
    CreateDirectory(String),

    #[error("Failed to connect AI database: {0}")]
    DatabaseConnection(String),

    #[error("Failed to initialize AI database schema: {0}")]
    SchemaInitialization(String),

    #[error("AI database error: {0}")]
    Database(String),

    #[error("Invalid arguments: {0}")]
    InvalidArguments(String),

    #[error("API key cannot be empty")]
    EmptyApiKey,

    #[error("Missing API key for provider '{0}'. Configure it in setup before chatting.")]
    MissingApiKey(String),

    #[error("Invalid AI attachment: {0}")]
    InvalidAttachment(String),

    #[error("Unsupported AI attachment type: {0}")]
    UnsupportedAttachmentType(String),

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Keyring error: {0}")]
    Keyring(String),

    #[error("AI provider request failed: {0}")]
    Provider(String),

    #[error("Failed to emit AI stream event: {0}")]
    EventEmit(String),
}

impl From<std::io::Error> for AiError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error.to_string())
    }
}

impl From<serde_json::Error> for AiError {
    fn from(error: serde_json::Error) -> Self {
        Self::Parse(error.to_string())
    }
}

impl From<keyring::Error> for AiError {
    fn from(error: keyring::Error) -> Self {
        Self::Keyring(error.to_string())
    }
}

impl Serialize for AiError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
