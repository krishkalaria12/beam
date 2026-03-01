pub mod indexer;
pub mod search;
pub mod types;

use papaya::HashMap as ConcurrentMap;
use std::collections::HashMap;
use std::sync::Arc;

use self::indexer::{builder, cache, watcher};
use self::types::{FileEntry, IndexUpdate};

pub async fn initialize_backend(index: Arc<ConcurrentMap<String, FileEntry>>) {
    // A. Create the Channel for the Watcher
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<IndexUpdate>();

    let maybe_index = match cache::get_cache_file() {
        Ok(Some(idx)) => Some(idx),
        Ok(None) => None,
        Err(_) => None,
    };

    match maybe_index {
        Some(idx) => {
            // Populate ConcurrentMap from loaded HashMap
            let pinned = index.pin();
            for (path, entry) in idx.entries {
                pinned.insert(path, entry);
            }
        }
        None => {
            match builder::build_file_index().await {
                Ok(entries) => {
                    // Convert Vec to HashMap for saving
                    let map: HashMap<String, FileEntry> =
                        entries.into_iter().map(|e| (e.path.clone(), e)).collect();

                    // Save to cache
                    if let Err(e) = cache::save_files_to_cache(map.clone()) {
                        log::error!("Failed to save cache: {}", e);
                    }

                    // Populate ConcurrentMap
                    let pinned = index.pin();
                    for (path, entry) in map {
                        pinned.insert(path, entry);
                    }
                }
                Err(e) => {
                    log::error!("Failed to build fresh index: {}", e);
                }
            }
        }
    };

    // D. Start the Watcher
    let _watcher = match watcher::start_watcher(tx.clone()) {
        Ok(w) => Some(w),
        Err(e) => {
            log::error!("Failed to start watcher: {}", e);
            None
        }
    };

    // E. Event Loop (Listen for updates forever)
    while let Some(update) = rx.recv().await {
        let pinned = index.pin();
        match update {
            IndexUpdate::Update(entry) | IndexUpdate::Create(entry) => {
                pinned.insert(entry.path.clone(), entry);
            }
            IndexUpdate::Delete(path_str) => {
                pinned.remove(&path_str);
            }
            IndexUpdate::ReloadAll => {
                log::warn!("ReloadAll event received but not implemented yet");
            }
        }
    }
}

use std::path::PathBuf;
use tauri::State;

use self::search::error::{FileSearchError, Result};
use self::search::search;
use self::types::FileIndex;
use self::{
    search::SearchOptions,
    types::{PaginatedSearchMetadata, PaginatedSearchResponse, SearchRequest},
};
use crate::config::config;
use crate::state::AppState;

// Searches for files in the index with pagination support
#[tauri::command]
pub fn search_files(
    request: SearchRequest,
    state: State<AppState>,
) -> Result<PaginatedSearchResponse> {
    // Validate query
    let normalized_query = request.query.trim();
    if normalized_query.is_empty() {
        return Err(FileSearchError::EmptyQuery);
    }

    // Validate pagination parameters
    if request.page == 0 {
        return Err(FileSearchError::InvalidPageNumber {
            provided: request.page,
            reason: "Page number must be 1 or greater".to_string(),
        });
    }

    if request.per_page == 0 {
        return Err(FileSearchError::InvalidPerPage {
            provided: request.per_page,
            max: config().FILE_SEARCH_MAX_RESULTS_PER_PAGE,
        });
    }

    if request.per_page > config().FILE_SEARCH_MAX_RESULTS_PER_PAGE {
        return Err(FileSearchError::InvalidPerPage {
            provided: request.per_page,
            max: config().FILE_SEARCH_MAX_RESULTS_PER_PAGE,
        });
    }

    let index = &state.index;
    let pinned = index.pin();

    // Check if index is initialized
    if pinned.is_empty() {
        return Err(FileSearchError::IndexNotInitialized);
    }

    // Build file index from ConcurrentMap
    let file_index = FileIndex {
        entries: pinned
            .iter()
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect(),
        built_at: 0,
    };

    // Prepare search options
    let search_options = SearchOptions {
        page: request.page,
        per_page: request.per_page,
    };

    // Perform search
    let search_response = search(normalized_query, &file_index, search_options)?;

    // Convert internal response to API response
    let metadata = PaginatedSearchMetadata {
        total_results: search_response.metadata.total_results,
        page: search_response.metadata.page,
        per_page: search_response.metadata.per_page,
        total_pages: search_response.metadata.total_pages,
        has_next_page: search_response.metadata.has_next_page,
        has_previous_page: search_response.metadata.has_previous_page,
    };

    Ok(PaginatedSearchResponse {
        results: search_response.results,
        metadata,
    })
}

// Opens a file with the system's default application
#[tauri::command]
pub async fn open_file(file_path: String) -> Result<()> {
    // Normalize the path - expand tilde to home directory
    let normalized_path = if file_path.starts_with("~/") {
        dirs::home_dir()
            .map(|home| home.join(&file_path[2..]))
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(file_path)
    } else {
        file_path
    };

    // Validate file path
    let path = PathBuf::from(&normalized_path);

    // Check if path is absolute
    if !path.is_absolute() {
        return Err(FileSearchError::InvalidFilePath(format!(
            "Path must be absolute: {}",
            normalized_path
        )));
    }

    // Check if file exists
    if !path.exists() {
        return Err(FileSearchError::FileNotFound(normalized_path));
    }

    // Check if it's a file (not a directory)
    if !path.is_file() {
        return Err(FileSearchError::InvalidFilePath(format!(
            "Path is not a file: {}",
            normalized_path
        )));
    }

    open::that(&path).map_err(|e| FileSearchError::InvalidFilePath(e.to_string()))?;

    Ok(())
}

// Gets information about a specific file
#[tauri::command]
pub fn get_file_info(file_path: String, state: State<AppState>) -> Result<FileEntry> {
    let index = &state.index;
    let pinned = index.pin();

    pinned
        .get(&file_path)
        .map(|entry| entry.clone())
        .ok_or_else(|| FileSearchError::FileNotFound(file_path))
}
