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

// Pagination Metadata (Sent to Frontend)
#[derive(Debug, Clone, Serialize)]
pub struct PaginatedSearchMetadata {
    // Total number of matching results
    pub total_results: usize,

    // Current page number (1-indexed)
    pub page: usize,

    // Number of results per page
    pub per_page: usize,

    // Total number of pages
    pub total_pages: usize,

    // Whether there's a next page
    pub has_next_page: bool,

    // Whether there's a previous page
    pub has_previous_page: bool,
}

// Complete Search Response with Pagination (Sent to Frontend)
#[derive(Debug, Clone, Serialize)]
pub struct PaginatedSearchResponse {
    // The search results for the current page
    pub results: Vec<SearchResult>,

    // Pagination metadata
    pub metadata: PaginatedSearchMetadata,
}

// Search Request Parameters (Received from Frontend)
#[derive(Debug, Clone, Deserialize)]
pub struct SearchRequest {
    // The search query string
    pub query: String,

    // Page number (1-indexed, defaults to 1)
    #[serde(default = "default_page")]
    pub page: usize,

    // Number of results per page (defaults to 20, max 100)
    #[serde(default = "default_per_page")]
    pub per_page: usize,
}

fn default_page() -> usize {
    1
}

fn default_per_page() -> usize {
    20
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
