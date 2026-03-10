use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, NotesError>;

#[derive(Debug, Clone, Error)]
pub enum NotesError {
    #[error("failed to resolve app local data directory")]
    AppDataDirUnavailable,

    #[error("failed to create notes data directory: {0}")]
    CreateDirectory(String),

    #[error("failed to connect notes sqlite database: {0}")]
    DatabaseConnection(String),

    #[error("failed to initialize notes schema: {0}")]
    SchemaInitialization(String),

    #[error("Database failure: {0}")]
    Database(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    InvalidArguments(String),
}

impl Serialize for NotesError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
