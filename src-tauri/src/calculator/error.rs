use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Soulver evaluation failed: {0}")]
    SoulverError(String),

    #[error("Failed to open store: {0}")]
    StoreOpeningError(String),

    #[error("Failed to save store: {0}")]
    StoreSaveError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
