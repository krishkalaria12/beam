use futures_util::future;
use log::warn;
use notify_debouncer_mini::{
    new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde_json::from_value;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Wry};
use tauri_plugin_store::{Store, StoreExt};

use super::{
    app_entry::{AppEntry, SearchableAppEntry},
    collector::collect_searchable_applications,
    error::{ApplicationsError, Result},
};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;
use crate::settings;

static APPLICATIONS_REFRESH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static LIVE_APPLICATIONS: Lazy<RwLock<Vec<SearchableAppEntry>>> =
    Lazy::new(|| RwLock::new(Vec::new()));
const APPLICATIONS_WATCHER_DEBOUNCE_MS: u64 = 500;

fn replace_live_applications(applications: &[SearchableAppEntry]) {
    *LIVE_APPLICATIONS.write() = applications.to_vec();
}

fn clear_live_applications() {
    LIVE_APPLICATIONS.write().clear();
}

fn read_live_applications() -> Option<Vec<SearchableAppEntry>> {
    let applications = LIVE_APPLICATIONS.read();
    if applications.is_empty() {
        None
    } else {
        Some(applications.clone())
    }
}

fn read_backup_applications(store: &Store<Wry>) -> Option<Vec<SearchableAppEntry>> {
    let json_value = store.get(APPLICATIONS_CONFIG.cache_key)?;
    from_value::<Vec<SearchableAppEntry>>(json_value.clone())
        .ok()
        .or_else(|| {
            from_value::<Vec<AppEntry>>(json_value).ok().map(|entries| {
                entries
                    .into_iter()
                    .map(|entry| SearchableAppEntry {
                        comment: entry.description.clone(),
                        generic_name: String::new(),
                        keywords: Vec::new(),
                        app: entry,
                    })
                    .collect()
            })
        })
}

fn write_backup_applications(
    store: Arc<Store<Wry>>,
    applications: &[SearchableAppEntry],
) -> Result<()> {
    let app_json = serde_json::to_value(applications)
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;
    let current_time = serde_json::to_value(jiff::Timestamp::now().as_second())
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;

    store.set(APPLICATIONS_CONFIG.cache_key, app_json);
    store.set(APPLICATIONS_CONFIG.last_updated_timestamp_key, current_time);
    store
        .save()
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;

    Ok(())
}

pub fn invalidate_applications_cache(app: &AppHandle<Wry>) -> Result<()> {
    clear_live_applications();

    let store = app
        .store(&APP_CONFIG.store_file_name)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;

    store.delete(APPLICATIONS_CONFIG.cache_key);
    store.delete(APPLICATIONS_CONFIG.last_updated_timestamp_key);
    store
        .save()
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;

    let _ = app.emit(APPLICATIONS_CONFIG.cache_updated_event, ());
    Ok(())
}

fn refresh_live_applications(app: &AppHandle<Wry>) -> Result<Vec<SearchableAppEntry>> {
    let selected_icon_theme = settings::get_selected_icon_theme(app)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;
    let applications = collect_searchable_applications(selected_icon_theme)?;
    replace_live_applications(&applications);

    match app.store(&APP_CONFIG.store_file_name) {
        Ok(store) => {
            if let Err(error) = write_backup_applications(store, &applications) {
                warn!("Failed to persist applications backup cache: {error}");
            }
        }
        Err(error) => {
            warn!("Failed to open applications store for backup cache: {error}");
        }
    }

    let _ = app.emit(APPLICATIONS_CONFIG.cache_updated_event, ());
    Ok(applications)
}

fn refresh_live_applications_in_background(app: AppHandle<Wry>) {
    if APPLICATIONS_REFRESH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn_blocking(move || {
        let refresh_result = (|| -> Result<()> {
            refresh_live_applications(&app)?;
            Ok(())
        })();

        if let Err(error) = refresh_result {
            warn!("Background applications refresh failed: {error}");
        }

        APPLICATIONS_REFRESH_IN_PROGRESS.store(false, Ordering::Release);
    });
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

fn resolve_application_directories() -> Vec<PathBuf> {
    APPLICATIONS_CONFIG
        .application_directories
        .iter()
        .map(|path| expand_home(path))
        .collect()
}

fn watch_path(
    debouncer: &mut Debouncer<RecommendedWatcher>,
    watched_paths: &mut HashSet<PathBuf>,
    path: PathBuf,
    recursive_mode: RecursiveMode,
) {
    if !watched_paths.insert(path.clone()) {
        return;
    }

    if let Err(error) = debouncer.watcher().watch(&path, recursive_mode) {
        warn!(
            "Skipping applications watcher path {}: {}",
            path.display(),
            error
        );
    }
}

fn start_applications_watcher(app: AppHandle<Wry>) -> Result<Debouncer<RecommendedWatcher>> {
    let watcher_app = app.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(APPLICATIONS_WATCHER_DEBOUNCE_MS),
        move |result: DebounceEventResult| match result {
            Ok(events) => {
                if events.is_empty() {
                    return;
                }

                refresh_live_applications_in_background(watcher_app.clone());
            }
            Err(error) => {
                warn!("Applications watcher error: {:?}", error);
            }
        },
    )
    .map_err(|e| ApplicationsError::CollectingDesktopFilesError(e.to_string()))?;

    let mut watched_paths = HashSet::new();
    for path in resolve_application_directories() {
        if path.exists() {
            watch_path(
                &mut debouncer,
                &mut watched_paths,
                path,
                RecursiveMode::Recursive,
            );
            continue;
        }

        if let Some(parent) = path.parent().filter(|parent| parent.exists()) {
            watch_path(
                &mut debouncer,
                &mut watched_paths,
                parent.to_path_buf(),
                RecursiveMode::NonRecursive,
            );
        }
    }

    Ok(debouncer)
}

pub fn initialize_backend(app: AppHandle<Wry>) {
    clear_live_applications();
    refresh_live_applications_in_background(app.clone());

    tauri::async_runtime::spawn(async move {
        let _watcher = match start_applications_watcher(app) {
            Ok(watcher) => Some(watcher),
            Err(error) => {
                warn!("Failed to start applications watcher: {error}");
                None
            }
        };

        future::pending::<()>().await;
    });
}

pub fn get_searchable_applications(app: AppHandle<Wry>) -> Result<Vec<SearchableAppEntry>> {
    if let Some(applications) = read_live_applications() {
        return Ok(applications);
    }

    match refresh_live_applications(&app) {
        Ok(applications) => Ok(applications),
        Err(refresh_error) => {
            let store = app
                .store(&APP_CONFIG.store_file_name)
                .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;

            if let Some(cached_applications) = read_backup_applications(&store) {
                warn!(
                    "Falling back to persisted applications backup after live refresh failed: {}",
                    refresh_error
                );
                replace_live_applications(&cached_applications);
                Ok(cached_applications)
            } else {
                Err(refresh_error)
            }
        }
    }
}

pub fn get_applications(app: AppHandle<Wry>) -> Result<Vec<AppEntry>> {
    Ok(get_searchable_applications(app)?
        .into_iter()
        .map(|entry| entry.into_public_entry())
        .collect())
}
