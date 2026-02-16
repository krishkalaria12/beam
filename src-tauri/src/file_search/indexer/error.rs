use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug)]
pub enum Error {
    ErrorCreatingCacheFolder(String),
    ErrorFindingCacheFolder(String),
    ErrorGettingCacheDir(String),
    ErrorCreatingCacheFile(String),
    ErrorOpeningCacheFile(String),
    ErrorReadingCacheFile(String),
    ErrorWritingCacheIntoFile(String),
    ErrorFlushingCacheFile(String),
    ErrorValidatingCache(String),
    ErrorDeserializingCache(String),

    // Builder Errors
    ErrorFindingHomeDir(String),
    ErrorJoiningTask(String),
    ErrorWalkingFiles(String),

    // Watcher Errors
    WatcherError(String),
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
            Self::ErrorCreatingCacheFolder(e) => write!(fmt, "Failed to create cache folder: {e}"),
            Self::ErrorFindingCacheFolder(e) => write!(fmt, "Failed to find cache folder: {e}"),
            Self::ErrorGettingCacheDir(e) => write!(fmt, "Failed to get cache directory: {e}"),
            Self::ErrorCreatingCacheFile(e) => write!(fmt, "Failed to create cache file: {e}"),
            Self::ErrorOpeningCacheFile(e) => write!(fmt, "Failed to open cache file: {e}"),
            Self::ErrorReadingCacheFile(e) => write!(fmt, "Failed to read cache file: {e}"),
            Self::ErrorWritingCacheIntoFile(e) => {
                write!(fmt, "Failed to write into cache file: {e}")
            }
            Self::ErrorFlushingCacheFile(e) => write!(fmt, "Failed to flush cache file: {e}"),
            Self::ErrorValidatingCache(e) => write!(fmt, "Cache validation failed: {e}"),
            Self::ErrorDeserializingCache(e) => write!(fmt, "Failed to deserialize cache: {e}"),

            Self::ErrorFindingHomeDir(e) => write!(fmt, "Failed to find home directory: {e}"),
            Self::ErrorJoiningTask(e) => write!(fmt, "Background task failed: {e}"),
            Self::ErrorWalkingFiles(e) => write!(fmt, "Error while walking files: {e}"),

            Self::WatcherError(e) => write!(fmt, "Error while watching files: {e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
