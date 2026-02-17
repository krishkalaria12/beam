use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub enum Error {
    NameIsEmptyError(String),
    KeywordIsEmptyError(String),
    URLParsingError(String),
    StoreOpeningError(String),
    SerializationError(String),
    StoreSaveError(String),
    DuplicationError(String),
    KeywordNotFoundError(String),
    FaviconFetchError(String),
    FaviconNotFoundError(String),
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
            Self::NameIsEmptyError(e) => write!(fmt, "name is empty: {e}"),
            Self::KeywordIsEmptyError(e) => write!(fmt, "keyword is empty: {e}"),
            Self::URLParsingError(e) => write!(fmt, "url parsing error: {e}"),
            Self::SerializationError(e) => write!(fmt, "serialization failed: {e}"),
            Self::StoreOpeningError(e) => write!(fmt, "store opening failed: {e}"),
            Self::StoreSaveError(e) => write!(fmt, "store save failed: {e}"),
            Self::DuplicationError(e) => write!(fmt, "duplicate entry: {e}"),
            Self::KeywordNotFoundError(e) => write!(fmt, "keyword not found: {e}"),
            Self::FaviconFetchError(e) => write!(fmt, "favicon fetch failed: {e}"),
            Self::FaviconNotFoundError(e) => write!(fmt, "favicon not found: {e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
