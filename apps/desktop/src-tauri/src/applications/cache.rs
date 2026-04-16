use futures_util::future;
use jiff::Timestamp;
use log::warn;
use notify_debouncer_mini::{
    new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use serde_json::from_value;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Wry};
use tauri_plugin_store::{Store, StoreExt};
use walkdir::WalkDir;

use super::{
    app_entry::AppEntry,
    collector::collect_applications,
    error::{ApplicationsError, Result},
};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;
use crate::settings;

static APPLICATIONS_REFRESH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
const APPLICATIONS_WATCHER_DEBOUNCE_MS: u64 = 500;

fn read_cache_timestamp(store: &Store<Wry>) -> Option<i64> {
    store
        .get(APPLICATIONS_CONFIG.last_updated_timestamp_key)
        .and_then(|timestamp| timestamp.as_i64())
}

fn should_use_cached_applications(store: &Store<Wry>) -> bool {
    let Some(stored_time) = read_cache_timestamp(store) else {
        return false;
    };

    let now = Timestamp::now().as_second();
    let diff_seconds = (APPLICATIONS_CONFIG.timestamp_diff_days as i64) * 86400;

    (now - stored_time) <= diff_seconds
}

fn read_cached_applications(store: &Store<Wry>) -> Option<Vec<AppEntry>> {
    let json_value = store.get(&APPLICATIONS_CONFIG.cache_key)?;
    from_value::<Vec<AppEntry>>(json_value).ok()
}

fn write_applications_cache(store: Arc<Store<Wry>>, applications: &[AppEntry]) -> Result<()> {
    let app_json = serde_json::to_value(applications)
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;
    let current_time = serde_json::to_value(Timestamp::now().as_second())
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;

    store.set(APPLICATIONS_CONFIG.cache_key, app_json);
    store.set(APPLICATIONS_CONFIG.last_updated_timestamp_key, current_time);
    store
        .save()
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;

    Ok(())
}

pub fn invalidate_applications_cache(app: &AppHandle<Wry>) -> Result<()> {
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

fn refresh_applications_cache(app: &AppHandle<Wry>) -> Result<Vec<AppEntry>> {
    let selected_icon_theme = settings::get_selected_icon_theme(app)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;
    let applications = collect_applications(selected_icon_theme)?;
    let store = app
        .store(&APP_CONFIG.store_file_name)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;

    write_applications_cache(store, &applications)?;
    let _ = app.emit(APPLICATIONS_CONFIG.cache_updated_event, ());
    Ok(applications)
}

fn refresh_applications_cache_in_background(app: AppHandle<Wry>) {
    if APPLICATIONS_REFRESH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn_blocking(move || {
        let refresh_result = (|| -> Result<()> {
            refresh_applications_cache(&app)?;
            Ok(())
        })();

        if let Err(err) = refresh_result {
            eprintln!("beam: background applications refresh failed: {err}");
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

fn is_desktop_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("desktop"))
}

fn modified_timestamp(path: &Path) -> Option<i64> {
    fs::metadata(path)
        .ok()?
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|duration| i64::try_from(duration.as_secs()).ok())
}

fn applications_sources_changed_since(timestamp: i64) -> bool {
    resolve_application_directories()
        .into_iter()
        .filter(|path| path.exists())
        .flat_map(|root| {
            WalkDir::new(root)
                .into_iter()
                .filter_map(|entry| entry.ok())
                .map(|entry| entry.into_path())
                .collect::<Vec<_>>()
        })
        .filter(|path| path.is_dir() || is_desktop_file(path))
        .filter_map(|path| modified_timestamp(&path))
        .any(|modified_at| modified_at > timestamp)
}

fn invalidate_cache_if_sources_changed(app: &AppHandle<Wry>) -> Result<bool> {
    let store = app
        .store(&APP_CONFIG.store_file_name)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;
    let Some(timestamp) = read_cache_timestamp(&store) else {
        return Ok(false);
    };

    if applications_sources_changed_since(timestamp) {
        invalidate_applications_cache(app)?;
        return Ok(true);
    }

    Ok(false)
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

                if let Err(error) = invalidate_applications_cache(&watcher_app) {
                    warn!(
                        "Failed to invalidate applications cache after filesystem change: {error}"
                    );
                } else {
                    refresh_applications_cache_in_background(watcher_app.clone());
                }
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
    match invalidate_cache_if_sources_changed(&app) {
        Ok(true) => refresh_applications_cache_in_background(app.clone()),
        Ok(false) => {}
        Err(error) => {
            warn!("Failed to reconcile cached applications at startup: {error}");
        }
    }

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

pub fn get_applications_with_cache(app: AppHandle<Wry>) -> Result<Vec<AppEntry>> {
    let store = app
        .store(&APP_CONFIG.store_file_name)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;

    let cache_is_fresh = should_use_cached_applications(&store);
    let cached_applications = read_cached_applications(&store);

    if let Some(cached_apps) = cached_applications {
        if !cache_is_fresh {
            refresh_applications_cache_in_background(app);
        }

        return Ok(cached_apps);
    }

    drop(store);
    refresh_applications_cache(&app)
}
