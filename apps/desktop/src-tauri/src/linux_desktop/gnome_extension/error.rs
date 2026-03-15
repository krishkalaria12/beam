use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, GnomeExtensionError>;

#[derive(Debug, Error)]
pub enum GnomeExtensionError {
    #[error("{0}")]
    DbusConnectionError(String),

    #[error("{0}")]
    DbusProxyError(String),

    #[error("{0}")]
    DbusCallError(String),

    #[error("{0}")]
    ParseError(String),

    #[error("{0}")]
    HomeDirectoryUnavailable(String),

    #[error("{0}")]
    FileSystemError(String),

    #[error("{0}")]
    CommandExecutionError(String),

    #[error("{0}")]
    CommandFailed(String),

    #[error("{0}")]
    OpenDirectoryError(String),
}

impl Serialize for GnomeExtensionError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
