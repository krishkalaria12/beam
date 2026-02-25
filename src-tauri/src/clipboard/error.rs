use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ClipboardError>;

#[derive(Debug, Clone, Error)]
pub enum ClipboardError {
    #[error("{0}")]
    NewEntryKeyringError(String),

    #[error("{0}")]
    GettingPasswordKeyring(String),

    #[error("{0}")]
    SettingPasswordKeyring(String),

    #[error("{0}")]
    StoreOpeningError(String),

    #[error("{0}")]
    SerializationError(String),

    #[error("{0}")]
    StoreSaveError(String),

    #[error("{0}")]
    ClipboardEntry(String),

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
