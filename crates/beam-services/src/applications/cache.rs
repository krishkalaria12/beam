// PORT: apps/desktop/src-tauri/src/applications/cache.rs
// The tauri_plugin_store backup cache became a JsonStore on the same
// settings.json; the watcher parks its own thread instead of a pending
// tokio task; cache updates ride the typed bus.
use beam_core::{BeamContext, JsonStore};
use chrono::Utc;
use chrono_tz::UTC;
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
use std::time::Duration;

use super::{
    app_entry::{AppEntry, SearchableAppEntry},
    collect_searchable_applications,
    error::{ApplicationsError, Result},
};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;

#[cfg(target_os = "windows")]
use crate::windows_desktop::applications as windows_applications;

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

fn read_backup_applications(store: &JsonStore) -> Option<Vec<SearchableAppEntry>> {
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

fn write_backup_applications(store: &JsonStore, applications: &[SearchableAppEntry]) -> Result<()> {
    let app_json = serde_json::to_value(applications)
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;
    let current_time = serde_json::to_value(Utc::now().with_timezone(&UTC).timestamp())
        .map_err(|e| ApplicationsError::SerializationError(e.to_string()))?;

    store
        .set(APPLICATIONS_CONFIG.cache_key, &app_json)
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;
    store
        .set(
            APPLICATIONS_CONFIG.last_updated_timestamp_key,
            &current_time,
        )
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;

    Ok(())
}

pub fn invalidate_applications_cache(cx: &BeamContext) -> Result<()> {
    clear_live_applications();

    let store = open_settings_store(cx)?;

    store
        .remove(APPLICATIONS_CONFIG.cache_key)
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;
    store
        .remove(APPLICATIONS_CONFIG.last_updated_timestamp_key)
        .map_err(|e| ApplicationsError::StoreSaveError(e.to_string()))?;

    cx.emit(beam_core::BeamEvent::ApplicationsCacheUpdated);
    Ok(())
}

/// Opens the shared settings store (the applications backup cache lives in
/// settings.json under the applications namespace, same as the old build).
fn open_settings_store(cx: &BeamContext) -> Result<JsonStore> {
    JsonStore::open(cx.paths().store_path(APP_CONFIG.store_file_name))
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))
}

fn refresh_live_applications(cx: &BeamContext) -> Result<Vec<SearchableAppEntry>> {
    let selected_icon_theme = crate::settings::get_selected_icon_theme(cx)
        .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;
    let applications = collect_platform_applications(selected_icon_theme)?;
    replace_live_applications(&applications);

    match open_settings_store(cx) {
        Ok(store) => {
            if let Err(error) = write_backup_applications(&store, &applications) {
                warn!("Failed to persist applications backup cache: {error}");
            }
        }
        Err(error) => {
            warn!("Failed to open applications store for backup cache: {error}");
        }
    }

    cx.emit(beam_core::BeamEvent::ApplicationsCacheUpdated);
    Ok(applications)
}

fn refresh_live_applications_in_background(cx: &BeamContext) {
    if APPLICATIONS_REFRESH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    let context = cx.clone();
    std::thread::spawn(move || {
        let refresh_result = (|| -> Result<()> {
            refresh_live_applications(&context)?;
            Ok(())
        })();

        if let Err(error) = refresh_result {
            warn!("Background applications refresh failed: {error}");
        }

        APPLICATIONS_REFRESH_IN_PROGRESS.store(false, Ordering::Release);
    });
}

#[cfg(target_os = "linux")]
fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }

    PathBuf::from(path)
}

#[cfg(target_os = "windows")]
fn collect_platform_applications(
    _selected_icon_theme: Option<String>,
) -> Result<Vec<SearchableAppEntry>> {
    Ok(windows_applications::collect_searchable_applications(None))
}

#[cfg(not(target_os = "windows"))]
fn collect_platform_applications(
    selected_icon_theme: Option<String>,
) -> Result<Vec<SearchableAppEntry>> {
    collect_searchable_applications(selected_icon_theme)
}

#[cfg(target_os = "linux")]
fn resolve_application_directories() -> Vec<PathBuf> {
    APPLICATIONS_CONFIG
        .application_directories
        .iter()
        .map(|path| expand_home(path))
        .collect()
}

#[cfg(target_os = "windows")]
fn resolve_application_directories() -> Vec<PathBuf> {
    windows_applications::start_menu_directories()
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn resolve_application_directories() -> Vec<PathBuf> {
    Vec::new()
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

fn start_applications_watcher(cx: &BeamContext) -> Result<Debouncer<RecommendedWatcher>> {
    let watcher_app = cx.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(APPLICATIONS_WATCHER_DEBOUNCE_MS),
        move |result: DebounceEventResult| match result {
            Ok(events) => {
                if events.is_empty() {
                    return;
                }

                refresh_live_applications_in_background(&watcher_app);
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

pub fn initialize_backend(cx: &BeamContext) {
    clear_live_applications();
    refresh_live_applications_in_background(cx);

    // The directory watcher runs on its own thread; the old build parked a
    // tokio task on `future::pending` to keep the debouncer alive.
    match start_applications_watcher(cx) {
        Ok(watcher) => {
            std::thread::spawn(move || {
                // Keep the debouncer alive for the process lifetime.
                loop {
                    std::thread::sleep(Duration::from_secs(3600));
                    let _ = &watcher;
                }
            });
        }
        Err(error) => {
            warn!("Failed to start applications watcher: {error}");
        }
    }
    let _ = future::pending::<()>;
}

pub fn get_searchable_applications(cx: &BeamContext) -> Result<Vec<SearchableAppEntry>> {
    if let Some(applications) = read_live_applications() {
        return Ok(applications);
    }

    match refresh_live_applications(cx) {
        Ok(applications) => Ok(applications),
        Err(refresh_error) => {
            let store = open_settings_store(cx)?;

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

pub fn get_applications(cx: &BeamContext) -> Result<Vec<AppEntry>> {
    Ok(get_searchable_applications(cx)?
        .into_iter()
        .map(|entry| entry.into_public_entry())
        .collect())
}
