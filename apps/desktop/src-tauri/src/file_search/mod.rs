pub(crate) mod config;
pub mod indexer;
pub mod search;
pub mod types;

use papaya::HashMap as ConcurrentMap;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tokio::sync::mpsc::UnboundedSender;

use self::indexer::{builder, cache, watcher};
use self::types::{FileEntry, IndexUpdate};

fn snapshot_index(index: &ConcurrentMap<String, FileEntry>) -> HashMap<String, FileEntry> {
    let pinned = index.pin();
    pinned
        .iter()
        .map(|(path, entry)| (path.clone(), entry.clone()))
        .collect()
}

fn replace_index(index: &ConcurrentMap<String, FileEntry>, entries: HashMap<String, FileEntry>) {
    let pinned = index.pin();
    pinned.clear();

    for (path, entry) in entries {
        pinned.insert(path, entry);
    }
}

fn remove_path_and_children(index: &ConcurrentMap<String, FileEntry>, path: &str) {
    let pinned = index.pin();
    pinned.remove(path);

    let nested_prefix = format!("{path}/");
    let nested_paths: Vec<String> = pinned
        .iter()
        .filter_map(|(existing_path, _)| {
            existing_path
                .starts_with(&nested_prefix)
                .then_some(existing_path.clone())
        })
        .collect();

    for nested_path in nested_paths {
        pinned.remove(&nested_path);
    }
}

fn persist_index_snapshot(index: &ConcurrentMap<String, FileEntry>) {
    let snapshot = snapshot_index(index);
    if let Err(error) = cache::save_files_to_cache(snapshot) {
        log::error!("Failed to save file index cache: {}", error);
    }
}

fn schedule_full_rebuild(tx: UnboundedSender<IndexUpdate>) {
    tauri::async_runtime::spawn(async move {
        match builder::build_file_index().await {
            Ok(entries) => {
                let rebuilt_index: HashMap<String, FileEntry> = entries
                    .into_iter()
                    .map(|entry| (entry.path.clone(), entry))
                    .collect();

                if let Err(error) = tx.send(IndexUpdate::ReplaceAll(rebuilt_index)) {
                    log::warn!("Failed to send rebuilt file index snapshot: {}", error);
                }
            }
            Err(error) => {
                log::error!("Failed to rebuild file index: {}", error);
                let _ = tx.send(IndexUpdate::RebuildFailed);
            }
        }
    });
}

pub async fn initialize_backend(index: Arc<ConcurrentMap<String, FileEntry>>) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<IndexUpdate>();

    let maybe_index = match cache::get_cache_file() {
        Ok(Some(idx)) => Some(idx),
        Ok(None) => None,
        Err(error) => {
            log::warn!(
                "Failed to load file index cache, scheduling rebuild: {}",
                error
            );
            None
        }
    };

    let cache_is_stale = cache::is_cache_older_than_24_hours().unwrap_or_else(|error| {
        log::warn!("Failed to read file index cache age, rebuilding: {}", error);
        true
    });

    let has_cache = maybe_index.is_some();

    if let Some(idx) = maybe_index {
        replace_index(&index, idx.entries);
    }

    let _watcher = match watcher::start_watcher(tx.clone()) {
        Ok(watcher) => Some(watcher),
        Err(error) => {
            log::error!("Failed to start watcher: {}", error);
            None
        }
    };

    let mut changes_during_rebuild = false;
    let mut rebuild_in_progress = if !has_cache {
        log::info!("No file index cache found, building a fresh index");
        schedule_full_rebuild(tx.clone());
        true
    } else {
        if cache_is_stale {
            log::info!("File index cache is older than 24 hours, reconciling at startup");
        } else {
            log::info!("Loaded file index cache, reconciling in background");
        }
        schedule_full_rebuild(tx.clone());
        true
    };

    let flush_delay = Duration::from_millis(FILE_SEARCH_CONFIG.cache_flush_debounce_ms);
    let mut cache_dirty = false;

    loop {
        let maybe_update = if cache_dirty {
            match tokio::time::timeout(flush_delay, rx.recv()).await {
                Ok(update) => update,
                Err(_) => {
                    persist_index_snapshot(&index);
                    cache_dirty = false;
                    continue;
                }
            }
        } else {
            rx.recv().await
        };

        let Some(update) = maybe_update else {
            break;
        };

        match update {
            IndexUpdate::Update(entry) | IndexUpdate::Create(entry) => {
                let pinned = index.pin();
                pinned.insert(entry.path.clone(), entry);
                cache_dirty = true;
                if rebuild_in_progress {
                    changes_during_rebuild = true;
                }
            }
            IndexUpdate::Delete(path_str) => {
                remove_path_and_children(&index, &path_str);
                cache_dirty = true;
                if rebuild_in_progress {
                    changes_during_rebuild = true;
                }
            }
            IndexUpdate::ReloadAll => {
                if !rebuild_in_progress {
                    schedule_full_rebuild(tx.clone());
                    rebuild_in_progress = true;
                    changes_during_rebuild = false;
                } else {
                    changes_during_rebuild = true;
                }
            }
            IndexUpdate::ReplaceAll(entries) => {
                let needs_follow_up_rebuild = changes_during_rebuild;
                replace_index(&index, entries);
                persist_index_snapshot(&index);
                cache_dirty = false;
                rebuild_in_progress = false;
                changes_during_rebuild = false;

                if needs_follow_up_rebuild {
                    schedule_full_rebuild(tx.clone());
                    rebuild_in_progress = true;
                }
            }
            IndexUpdate::RebuildFailed => {
                rebuild_in_progress = false;
                changes_during_rebuild = false;
            }
        }
    }

    if cache_dirty {
        persist_index_snapshot(&index);
    }
}

use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

use self::search::error::{FileSearchError, Result};
use self::search::search;
use self::types::FileIndex;
use self::{
    search::SearchOptions,
    types::{PaginatedSearchMetadata, PaginatedSearchResponse, SearchRequest},
};
use crate::file_search::config::CONFIG as FILE_SEARCH_CONFIG;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct FileSearchBackendStatus {
    pub backend: String,
    pub dsearch_available: bool,
    pub install_url: Option<String>,
}

// Searches for files in the index with pagination support
#[tauri::command]
pub async fn search_files(
    app: AppHandle,
    request: SearchRequest,
    state: State<'_, AppState>,
) -> Result<PaginatedSearchResponse> {
    let normalized_query = validate_search_request(&request)?;
    let index = Arc::clone(&state.index);

    #[cfg(target_os = "linux")]
    if let Some(response) = crate::danksearch::search_files(&app, &request).await {
        return Ok(response);
    }

    search_files_native(&index, &request, &normalized_query)
}

fn validate_search_request(request: &SearchRequest) -> Result<String> {
    let normalized_query = request.query.trim();
    if normalized_query.is_empty() {
        return Err(FileSearchError::EmptyQuery);
    }

    if request.page == 0 {
        return Err(FileSearchError::InvalidPageNumber {
            provided: request.page,
            reason: "Page number must be 1 or greater".to_string(),
        });
    }

    if request.per_page == 0 || request.per_page > FILE_SEARCH_CONFIG.max_results_per_page {
        return Err(FileSearchError::InvalidPerPage {
            provided: request.per_page,
            max: FILE_SEARCH_CONFIG.max_results_per_page,
        });
    }

    Ok(normalized_query.to_string())
}

fn search_files_native(
    index: &Arc<ConcurrentMap<String, FileEntry>>,
    request: &SearchRequest,
    normalized_query: &str,
) -> Result<PaginatedSearchResponse> {
    let pinned = index.pin();

    if pinned.is_empty() {
        return Err(FileSearchError::IndexNotInitialized);
    }

    let file_index = FileIndex {
        entries: pinned
            .iter()
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect(),
        built_at: 0,
    };

    let search_options = SearchOptions {
        page: request.page,
        per_page: request.per_page,
    };

    let search_response = search(normalized_query, &file_index, search_options)?;
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

#[tauri::command]
pub fn get_file_search_backend_status() -> FileSearchBackendStatus {
    #[cfg(target_os = "linux")]
    {
        let dsearch_available = crate::danksearch::is_available();
        return FileSearchBackendStatus {
            backend: if dsearch_available {
                "dsearch".to_string()
            } else {
                "native".to_string()
            },
            dsearch_available,
            install_url: (!dsearch_available)
                .then_some(crate::danksearch::DSEARCH_INSTALL_URL.to_string()),
        };
    }

    #[cfg(not(target_os = "linux"))]
    {
        FileSearchBackendStatus {
            backend: "native".to_string(),
            dsearch_available: false,
            install_url: None,
        }
    }
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
