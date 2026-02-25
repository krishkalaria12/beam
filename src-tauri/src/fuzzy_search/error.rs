use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, FuzzySearchError>;

#[derive(Debug, Error)]
pub enum FuzzySearchError {
    #[error("Invalid fuzzy query")]
    InvalidQuery,
}

impl Serialize for FuzzySearchError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
