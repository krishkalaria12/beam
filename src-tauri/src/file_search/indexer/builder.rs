use ignore::{WalkBuilder, WalkState};
use std::cmp::max;
use tokio::sync::mpsc;

use super::error::{IndexerError, Result};
use super::helper::{get_file_metadata, is_ignored_path};
use crate::file_search::types::FileEntry;

pub async fn build_file_index() -> Result<Vec<FileEntry>> {
    // 1. Calculate Safe Thread Count (Leave 2 cores free for UI/OS)
    let total_cores = num_cpus::get();
    let safe_threads = max(1, total_cores.saturating_sub(2));

    // 2. Create an Async Channel
    let (tx, mut rx) = mpsc::channel::<FileEntry>(1000);

    // 3. Run the Heavy Lifting in a Blocking Task
    let handle = tokio::task::spawn_blocking(move || {
        let root = dirs::home_dir().ok_or_else(|| {
            IndexerError::ErrorFindingHomeDir("Could not find system home directory".to_string())
        })?;

        let walker = WalkBuilder::new(root)
            .threads(safe_threads)
            .build_parallel();

        walker.run(|| {
            let tx = tx.clone();
            Box::new(move |entry_result| {
                let entry = match entry_result {
                    Ok(e) => e,
                    Err(err) => {
                        log::warn!("beam: error walking entry: {err}");
                        return WalkState::Continue;
                    }
                };

                // Filter logic
                if is_ignored_path(entry.path()) {
                    return WalkState::Skip;
                }

                if !entry.file_type().map(|f| f.is_file()).unwrap_or(false) {
                    return WalkState::Continue;
                }

                // Use the helper to get metadata, ensuring consistency
                if let Ok(file_entry) = get_file_metadata(entry.path()) {
                    if tx.blocking_send(file_entry).is_err() {
                        return WalkState::Quit;
                    }
                }
                WalkState::Continue
            })
        });

        Ok(())
    });

    // 4. Collect results in the Async Context
    let mut entries = Vec::new();

    // We want to wait for the walker to finish AND collect all results.
    // However, rx.recv() will only return None once all tx clones are dropped.
    // The walker runs in spawn_blocking and holds the last tx clone.

    while let Some(entry) = rx.recv().await {
        entries.push(entry);
    }

    // Check if the background task encountered any fatal errors
    handle
        .await
        .map_err(|e| IndexerError::ErrorJoiningTask(e.to_string()))??;

    Ok(entries)
}
