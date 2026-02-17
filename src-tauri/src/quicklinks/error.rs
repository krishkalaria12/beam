use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("Name is empty: {0}")]
    NameIsEmptyError(String),

    #[error("Keyword is empty: {0}")]
    KeywordIsEmptyError(String),

    #[error("URL parsing error: {0}")]
    URLParsingError(String),

    #[error("Store opening failed: {0}")]
    StoreOpeningError(String),

    #[error("Serialization failed: {0}")]
    SerializationError(String),

    #[error("Store save failed: {0}")]
    StoreSaveError(String),

    #[error("Duplicate entry: {0}")]
    DuplicationError(String),

    #[error("Keyword not found: {0}")]
    KeywordNotFoundError(String),

    #[error("Favicon fetch failed: {0}")]
    FaviconFetchError(String),

    #[error("Favicon not found: {0}")]
    FaviconNotFoundError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
