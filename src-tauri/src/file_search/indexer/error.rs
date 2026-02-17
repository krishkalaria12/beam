use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Failed to create cache folder: {0}")]
    ErrorCreatingCacheFolder(String),

    #[error("Failed to find cache folder: {0}")]
    ErrorFindingCacheFolder(String),

    #[error("Failed to get cache directory: {0}")]
    ErrorGettingCacheDir(String),

    #[error("Failed to create cache file: {0}")]
    ErrorCreatingCacheFile(String),

    #[error("Failed to open cache file: {0}")]
    ErrorOpeningCacheFile(String),

    #[error("Failed to read cache file: {0}")]
    ErrorReadingCacheFile(String),

    #[error("Failed to write into cache file: {0}")]
    ErrorWritingCacheIntoFile(String),

    #[error("Failed to flush cache file: {0}")]
    ErrorFlushingCacheFile(String),

    #[error("Cache validation failed: {0}")]
    ErrorValidatingCache(String),

    #[error("Failed to deserialize cache: {0}")]
    ErrorDeserializingCache(String),

    #[error("Failed to find home directory: {0}")]
    ErrorFindingHomeDir(String),

    #[error("Background task failed: {0}")]
    ErrorJoiningTask(String),

    #[error("Error while walking files: {0}")]
    ErrorWalkingFiles(String),

    #[error("Error while watching files: {0}")]
    WatcherError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
