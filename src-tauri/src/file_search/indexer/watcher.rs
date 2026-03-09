use log::{error, warn};
use notify_debouncer_mini::{
    new_debouncer, notify::RecommendedWatcher, notify::RecursiveMode, DebounceEventResult,
    Debouncer,
};
use std::time::Duration;
use tokio::sync::mpsc::UnboundedSender;

use super::super::types::IndexUpdate;
use super::{
    error::{IndexerError, Result},
    helper::{get_file_metadata, is_ignored_path, normalize_path},
};
use crate::config::config;

pub fn start_watcher(tx: UnboundedSender<IndexUpdate>) -> Result<Debouncer<RecommendedWatcher>> {
    let mut debouncer = new_debouncer(
        Duration::from_secs(config().FILE_WATCHER_DEBOUNCE_SEC as u64),
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
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| IndexerError::WatcherError(e.to_string()))?;

    Ok(debouncer)
}
