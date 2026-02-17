use std::path::PathBuf;
use tauri::State;

use crate::config::config;
use crate::file_search::search::search;
use crate::file_search::types::FileIndex;
use crate::{
    file_search::{
        search::error::{Error, Result},
        search::SearchOptions,
        types::{FileEntry, PaginatedSearchMetadata, PaginatedSearchResponse, SearchRequest},
    },
    state::AppState,
};

// Searches for files in the index with pagination support
#[tauri::command]
pub fn search_files(
    request: SearchRequest,
    state: State<AppState>,
) -> Result<PaginatedSearchResponse> {
    // Validate query
    let normalized_query = request.query.trim();
    if normalized_query.is_empty() {
        return Err(Error::EmptyQuery);
    }

    // Validate pagination parameters
    if request.page == 0 {
        return Err(Error::InvalidPageNumber {
            provided: request.page,
            reason: "Page number must be 1 or greater".to_string(),
        });
    }

    if request.per_page == 0 {
        return Err(Error::InvalidPerPage {
            provided: request.per_page,
            max: config().FILE_SEARCH_MAX_RESULTS_PER_PAGE,
        });
    }

    if request.per_page > config().FILE_SEARCH_MAX_RESULTS_PER_PAGE {
        return Err(Error::InvalidPerPage {
            provided: request.per_page,
            max: config().FILE_SEARCH_MAX_RESULTS_PER_PAGE,
        });
    }

    let index = &state.index;
    let pinned = index.pin();

    // Check if index is initialized
    if pinned.is_empty() {
        return Err(Error::IndexNotInitialized);
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
        return Err(Error::InvalidFilePath(format!(
            "Path must be absolute: {}",
            normalized_path
        )));
    }

    // Check if file exists
    if !path.exists() {
        return Err(Error::FileNotFound(normalized_path));
    }

    // Check if it's a file (not a directory)
    if !path.is_file() {
        return Err(Error::InvalidFilePath(format!(
            "Path is not a file: {}",
            normalized_path
        )));
    }

    open::that(&path).map_err(|e| Error::InvalidFilePath(e.to_string()))?;

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
        .ok_or_else(|| Error::FileNotFound(file_path))
}
