pub mod commands;
pub mod indexer;
pub mod search;
pub mod types;

use papaya::HashMap as ConcurrentMap;
use std::collections::HashMap;
use std::sync::Arc;

use indexer::{builder, cache, watcher};
use types::{FileEntry, IndexUpdate};

pub async fn initialize_backend(index: Arc<ConcurrentMap<String, FileEntry>>) {
    // A. Create the Channel for the Watcher
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<IndexUpdate>();

    // B. Try Load Cache or Build Fresh Index
    log::info!("Init: Loading Cache...");

    let maybe_index = match cache::get_cache_file() {
        Ok(Some(idx)) => {
            log::info!("Cache loaded! {} files.", idx.entries.len());
            Some(idx)
        }
        Ok(None) => {
            log::info!("Cache missing. Building fresh index...");
            None
        }
        Err(e) => {
            log::error!("Cache error: {}. Building fresh index...", e);
            None
        }
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
    log::info!("Init: Starting Watcher...");
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
