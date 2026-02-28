use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SnippetError>;

#[derive(Debug, Error)]
pub enum SnippetError {
    #[error("app local data directory unavailable")]
    AppDataDirUnavailable,

    #[error("failed to create snippets directory: {0}")]
    CreateDirectory(String),

    #[error("failed to connect snippets database: {0}")]
    DatabaseConnection(String),

    #[error("failed to initialize snippets schema: {0}")]
    SchemaInitialization(String),

    #[error("database error: {0}")]
    Database(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0} is required")]
    FieldNotFoundError(String),

    #[error("{0}")]
    ValidationError(String),

    #[error("cannot convert content type")]
    CannotConvertContentType,
}

impl Serialize for SnippetError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
