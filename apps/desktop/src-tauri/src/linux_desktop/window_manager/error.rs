use serde::Serialize;
use thiserror::Error;

use super::super::gnome_extension::error::GnomeExtensionError;

pub type Result<T> = std::result::Result<T, WindowManagerError>;

#[derive(Debug, Error)]
pub enum WindowManagerError {
    #[error("{0}")]
    UnsupportedSession(String),

    #[error("{0}")]
    ConnectionError(String),

    #[error("{0}")]
    QueryError(String),

    #[error("{0}")]
    CommandError(String),

    #[error("{0}")]
    InvalidWindowId(String),

    #[error("{0}")]
    ParseError(String),

    #[error("{0}")]
    BackendUnavailable(String),

    #[error("{0}")]
    GnomeExtensionError(#[from] GnomeExtensionError),
}

impl Serialize for WindowManagerError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
