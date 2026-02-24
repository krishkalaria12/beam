use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("{0}")]
    StoreOpeningError(String),

    #[error("{0}")]
    DeserializationError(String),

    #[error("{0}")]
    SerializationError(String),

    #[error("{0}")]
    InvalidArguments(String),

    #[error("{0}")]
    StoreSaveError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
