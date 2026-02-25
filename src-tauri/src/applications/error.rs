use freedesktop_file_parser::ParseError;
use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ApplicationsError>;

#[derive(Debug, Error)]
pub enum ApplicationsError {
    #[error("{0}")]
    CollectingDesktopFilesError(String),

    #[error("{0}")]
    ParsingDesktopFileError(#[from] ParseError),

    #[error("{0}")]
    ParsingIconError(String),

    #[error("{0}")]
    LaunchingApplicationError(String),

    #[error("{0}")]
    HidingWindowApplicationError(String),

    #[error("{0}")]
    StoreOpeningError(String),

    #[error("{0}")]
    SerializationError(String),

    #[error("{0}")]
    StoreSaveError(String),
}

impl Serialize for ApplicationsError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
