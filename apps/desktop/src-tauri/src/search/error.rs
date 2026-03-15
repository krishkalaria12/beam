use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SearchError>;

#[derive(Debug, Error)]
pub enum SearchError {
    #[error("{0}")]
    FailedToOpenBrowserError(String),

    #[error("{0}")]
    HidingWindowApplicationError(String),
}

impl Serialize for SearchError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
