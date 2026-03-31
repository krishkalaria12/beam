use log::{error, warn};
use notify_debouncer_mini::{
    new_debouncer, notify::RecommendedWatcher, notify::RecursiveMode, DebounceEventResult,
    Debouncer,
};
use std::fs;
use std::time::Duration;
use tokio::sync::mpsc::UnboundedSender;

use super::super::types::IndexUpdate;
use super::{
    error::{IndexerError, Result},
    helper::{get_file_metadata, is_ignored_path, normalize_path},
};
use crate::file_search::config::CONFIG as FILE_SEARCH_CONFIG;

pub fn start_watcher(tx: UnboundedSender<IndexUpdate>) -> Result<Debouncer<RecommendedWatcher>> {
    let mut debouncer = new_debouncer(
        Duration::from_secs(FILE_SEARCH_CONFIG.watcher_debounce_secs as u64),
        move |res: DebounceEventResult| match res {
            Ok(events) => {
                for event in events {
                    let path = event.path;

                    if is_ignored_path(&path) {
                        continue;
                    }

                    if path.exists() {
                        if path.is_dir() {
                            if let Err(e) = tx.send(IndexUpdate::ReloadAll) {
                                error!("Failed to send reload event: {}", e);
                            }
                            continue;
                        }

                        match get_file_metadata(&path) {
                            Ok(entry) => {
                                if let Err(e) = tx.send(IndexUpdate::Update(entry)) {
                                    error!("Failed to send update event: {}", e);
                                }
                            }
                            Err(e) => {
                                warn!("Failed to get metadata for {}: {}", path.display(), e);
                            }
                        }
                    } else {
                        let path_str = normalize_path(&path);
                        if let Err(e) = tx.send(IndexUpdate::Delete(path_str)) {
                            error!("Failed to send delete event: {}", e);
                        }
                    }
                }
            }
            Err(e) => error!("Watcher Error: {:?}", e),
        },
    )
    .map_err(|e| IndexerError::WatcherError(e.to_string()))?;

    let root = dirs::home_dir().ok_or_else(|| {
        IndexerError::ErrorFindingHomeDir("Could not find system home directory".to_string())
    })?;

    debouncer
        .watcher()
        .watch(&root, RecursiveMode::NonRecursive)
        .map_err(|e| IndexerError::WatcherError(e.to_string()))?;

    let root_entries =
        fs::read_dir(&root).map_err(|e| IndexerError::WatcherError(e.to_string()))?;

    for entry_result in root_entries {
        let entry = match entry_result {
            Ok(entry) => entry,
            Err(error) => {
                warn!("Skipping watcher entry in {}: {}", root.display(), error);
                continue;
            }
        };

        let path = entry.path();
        if is_ignored_path(&path) {
            continue;
        }

        let recursive_mode = match entry.file_type() {
            Ok(file_type) if file_type.is_dir() => RecursiveMode::Recursive,
            Ok(_) => RecursiveMode::NonRecursive,
            Err(error) => {
                warn!("Skipping watcher path {}: {}", path.display(), error);
                continue;
            }
        };

        if let Err(error) = debouncer.watcher().watch(&path, recursive_mode) {
            warn!("Skipping watcher path {}: {}", path.display(), error);
        }
    }

    Ok(debouncer)
}
