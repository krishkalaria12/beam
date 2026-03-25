use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ClipboardError>;

#[derive(Debug, Clone, Error)]
pub enum ClipboardError {
    #[error("clipboard app local data directory unavailable")]
    AppDataDirUnavailable,

    #[error("failed to create clipboard data directory: {0}")]
    CreateDirectory(String),

    #[error("failed to connect clipboard database: {0}")]
    DatabaseConnection(String),

    #[error("failed to initialize clipboard schema: {0}")]
    SchemaInitialization(String),

    #[error("clipboard database error: {0}")]
    Database(String),

    #[error("{0}")]
    NewEntryKeyringError(String),

    #[error("{0}")]
    GettingPasswordKeyring(String),

    #[error("{0}")]
    SettingPasswordKeyring(String),

    #[error("{0}")]
    EncryptionCipherInitError(String),

    #[error("{0}")]
    EncryptingClipboardValue(String),

    #[error("{0}")]
    DecryptingClipboardValue(String),
}

impl Serialize for ClipboardError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
