use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, StateError>;

#[derive(Debug, Clone, Error)]
pub enum StateError {
    #[error("application state is unavailable")]
    AppStateUnavailable,
}

impl Serialize for StateError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
