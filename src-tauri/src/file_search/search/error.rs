use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Lock poisoned: {0}")]
    LockPoisoned(String),

    #[error("Search query cannot be empty")]
    EmptyQuery,

    #[error("Invalid page number {provided}: {reason}")]
    InvalidPageNumber { provided: usize, reason: String },

    #[error("Invalid per_page value {provided}. Maximum allowed: {max}")]
    InvalidPerPage { provided: usize, max: usize },

    #[error("Search index not initialized")]
    IndexNotInitialized,

    #[error("Search operation failed: {0}")]
    SearchFailed(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Failed to open file '{path}': {reason}")]
    FileOpenFailed { path: String, reason: String },

    #[error("Invalid file path: {0}")]
    InvalidFilePath(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
