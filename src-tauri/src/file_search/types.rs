use bytecheck::CheckBytes;
use rkyv::{Archive, Deserialize as RkyvDeserialize, Serialize as RkyvSerialize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Core Data Structures (Saved to Disk)

#[derive(
    Debug, Clone, Serialize, Deserialize, Default, Archive, RkyvDeserialize, RkyvSerialize,
)]
#[archive_attr(derive(CheckBytes))]
pub struct FileEntry {
    // The full path (e.g., "/Users/{username}/dev/main.rs")
    pub path: String,

    // The filename (e.g., "main.rs")
    pub name: String,

    // File size in bytes
    pub size: u64,

    // Last modified time (Unix Timestamp in seconds)
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Archive, RkyvDeserialize, RkyvSerialize)]
#[archive_attr(derive(CheckBytes))]
pub struct FileIndex {
    // Key is the file path
    pub entries: HashMap<String, FileEntry>,

    // When this index was built (Unix Timestamp)
    pub built_at: u64,
}

impl Default for FileIndex {
    fn default() -> Self {
        Self {
            entries: HashMap::new(),
            built_at: 0,
        }
    }
}

// Search Results (Sent to Frontend)
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    // The file metadata (path, size, time)
    pub entry: FileEntry,

    // The match score (higher = better)
    pub score: u16,
}

// Event Commands For Watcher
#[derive(Debug, Clone)]
pub enum IndexUpdate {
    // A new file was created or a folder was moved in.
    Create(FileEntry),

    // An existing file was changed (size or timestamp).
    Update(FileEntry),

    // A file was deleted or moved out.
    Delete(String),

    // Used if the watcher hits a massive change (like a partition mount)
    ReloadAll,
}
