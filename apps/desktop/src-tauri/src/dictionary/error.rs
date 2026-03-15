use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, DictionaryError>;

#[derive(Debug, Error)]
pub enum DictionaryError {
    #[error("Request failed: {0}")]
    RequestError(String),

    #[error("Failed to parse response: {0}")]
    ParseError(String),

    #[error("Word not found")]
    NotFound,
}

impl Serialize for DictionaryError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
