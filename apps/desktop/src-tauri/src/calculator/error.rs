use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, CalculatorError>;

#[derive(Debug, Clone, Error)]
pub enum CalculatorError {
    #[error("calculator app local data directory unavailable")]
    AppDataDirUnavailable,

    #[error("failed to create calculator data directory: {0}")]
    CreateDirectory(String),

    #[error("failed to connect calculator database: {0}")]
    DatabaseConnection(String),

    #[error("failed to initialize calculator schema: {0}")]
    SchemaInitialization(String),

    #[error("calculator database error: {0}")]
    Database(String),

    #[error("Calculator evaluation failed: {0}")]
    EvaluationFailed(String),
}

impl Serialize for CalculatorError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
