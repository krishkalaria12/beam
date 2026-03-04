use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, CustomConfigError>;

#[derive(Debug, Error)]
pub enum CustomConfigError {
    #[error("failed to resolve config directory")]
    ConfigDirUnavailable,

    #[error("failed to create config directory: {0}")]
    ConfigDirCreateError(String),

    #[error("failed to read config file: {0}")]
    ReadError(String),

    #[error("failed to parse config file: {0}")]
    ParseError(String),

    #[error("config file root must be a JSON object")]
    InvalidRootDocument,

    #[error("failed to serialize config payload: {0}")]
    SerializationError(String),

    #[error("failed to write config file: {0}")]
    WriteError(String),

    #[error("invalid arguments: {0}")]
    InvalidArguments(String),
}

impl Serialize for CustomConfigError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
