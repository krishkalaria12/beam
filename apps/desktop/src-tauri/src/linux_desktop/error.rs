use serde::Serialize;
use thiserror::Error;

use super::gnome_extension::error::GnomeExtensionError;
use super::window_manager::error::WindowManagerError;

pub type Result<T> = std::result::Result<T, LinuxDesktopError>;

#[derive(Debug, Error)]
pub enum LinuxDesktopError {
    #[error("{0}")]
    ClipboardError(String),

    #[error("{0}")]
    SelectedTextError(String),

    #[error("{0}")]
    SerializationError(String),

    #[error("{0}")]
    ParseError(String),

    #[error("{0}")]
    MimeLookupError(String),

    #[error("{0}")]
    ApplicationLookupError(String),

    #[error("{0}")]
    FrontmostApplicationError(String),

    #[error("{0}")]
    FileManagerError(String),

    #[error("{0}")]
    GnomeExtensionError(#[from] GnomeExtensionError),

    #[error("{0}")]
    WindowManagerError(#[from] WindowManagerError),
}

impl Serialize for LinuxDesktopError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
