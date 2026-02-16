use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug)]
pub enum Error {
    // Lock/Concurrency Errors
    LockPoisoned(String),

    // Input Validation Errors
    EmptyQuery,
    InvalidPageNumber { provided: usize, reason: String },
    InvalidPerPage { provided: usize, max: usize },

    // Search Operation Errors
    IndexNotInitialized,
    SearchFailed(String),

    // File Operation Errors
    FileNotFound(String),
    FileOpenFailed { path: String, reason: String },
    InvalidFilePath(String),
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
            Self::LockPoisoned(e) => write!(fmt, "Lock poisoned: {e}"),
            Self::EmptyQuery => write!(fmt, "Search query cannot be empty"),
            Self::InvalidPageNumber { provided, reason } => {
                write!(fmt, "Invalid page number {provided}: {reason}")
            }
            Self::InvalidPerPage { provided, max } => {
                write!(
                    fmt,
                    "Invalid per_page value {provided}. Maximum allowed: {max}"
                )
            }
            Self::IndexNotInitialized => write!(fmt, "Search index not initialized"),
            Self::SearchFailed(e) => write!(fmt, "Search operation failed: {e}"),
            Self::FileNotFound(path) => write!(fmt, "File not found: {path}"),
            Self::FileOpenFailed { path, reason } => {
                write!(fmt, "Failed to open file '{path}': {reason}")
            }
            Self::InvalidFilePath(path) => write!(fmt, "Invalid file path: {path}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
