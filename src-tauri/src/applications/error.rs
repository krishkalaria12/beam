use freedesktop_file_parser::ParseError;
use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug)]
pub enum Error {
    CollectingDesktopFilesError(String),
    ParsingDesktopFileError(ParseError),
    ParsingIconError(String),
    LaunchingApplicationError(String),
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
            Self::CollectingDesktopFilesError(e) => write!(fmt, "{e}"),
            Self::ParsingDesktopFileError(e) => write!(fmt, "{e}"),
            Self::ParsingIconError(e) => write!(fmt, "{e}"),
            Self::LaunchingApplicationError(e) => write!(fmt, "{e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
