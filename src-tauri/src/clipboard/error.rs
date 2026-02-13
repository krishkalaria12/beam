use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub enum Error {
    NewEntryKeyringError(String),
    GettingPasswordKeyring(String),
    SettingPasswordKeyring(String),
    StoreOpeningError(String),
    SerializationError(String),
    StoreSaveError(String),
    ClipboardEntry(String),
    EncryptionCipherInitError(String),
    EncryptingClipboardValue(String),
    DecryptingClipboardValue(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// region:    --- Froms

crate::impl_froms! {}

// endregion: --- Froms

// region:    --- Error Boilerplate
impl core::fmt::Display for Error {
    fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::result::Result<(), core::fmt::Error> {
        match self {
            Self::NewEntryKeyringError(e) => write!(fmt, "{e}"),
            Self::GettingPasswordKeyring(e) => write!(fmt, "{e}"),
            Self::SettingPasswordKeyring(e) => write!(fmt, "{e}"),
            Self::StoreOpeningError(e) => write!(fmt, "{e}"),
            Self::SerializationError(e) => write!(fmt, "{e}"),
            Self::StoreSaveError(e) => write!(fmt, "{e}"),
            Self::ClipboardEntry(e) => write!(fmt, "{e}"),
            Self::EncryptionCipherInitError(e) => write!(fmt, "{e}"),
            Self::EncryptingClipboardValue(e) => write!(fmt, "{e}"),
            Self::DecryptingClipboardValue(e) => write!(fmt, "{e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
