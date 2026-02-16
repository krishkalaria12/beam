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

    // Check if index is initialized
    if index.is_empty() {
        return Err(Error::IndexNotInitialized);
    }

    // Build file index from DashMap
    let file_index = FileIndex {
        entries: index
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().clone()))
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
    // Validate file path
    let path = PathBuf::from(&file_path);

    // Check if path is absolute
    if !path.is_absolute() {
        return Err(Error::InvalidFilePath(format!(
            "Path must be absolute: {}",
            file_path
        )));
    }

    // Check if file exists
    if !path.exists() {
        return Err(Error::FileNotFound(file_path));
    }

    // Check if it's a file (not a directory)
    if !path.is_file() {
        return Err(Error::InvalidFilePath(format!(
            "Path is not a file: {}",
            file_path
        )));
    }

    // Open the file with the default application
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| Error::FileOpenFailed {
                path: file_path.clone(),
                reason: e.to_string(),
            })?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try xdg-open first, then fallback to other methods
        let result = std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn();

        if result.is_err() {
            // Fallback to kde-open5 for KDE
            let result = std::process::Command::new("kde-open5")
                .arg(&file_path)
                .spawn();

            if result.is_err() {
                // Fallback to gnome-open for GNOME
                let result = std::process::Command::new("gnome-open")
                    .arg(&file_path)
                    .spawn();

                if result.is_err() {
                    return Err(Error::FileOpenFailed {
                        path: file_path,
                        reason:
                            "No suitable file opener found (tried xdg-open, kde-open5, gnome-open)"
                                .to_string(),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", "", &file_path])
            .spawn()
            .map_err(|e| Error::FileOpenFailed {
                path: file_path.clone(),
                reason: e.to_string(),
            })?;
    }

    Ok(())
}

// Gets information about a specific file
#[tauri::command]
pub fn get_file_info(file_path: String, state: State<AppState>) -> Result<FileEntry> {
    let index = &state.index;

    index
        .get(&file_path)
        .map(|entry| entry.value().clone())
        .ok_or_else(|| Error::FileNotFound(file_path))
}
