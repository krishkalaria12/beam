use jiff::Timestamp;
use serde_json::from_value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Wry};
use tauri_plugin_store::{Store, StoreExt};

use super::{
    app_entry::AppEntry,
    collector::collect_applications,
    error::{ApplicationsError, Result},
};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::config::CONFIG as APP_CONFIG;

static APPLICATIONS_REFRESH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

fn should_use_cached_applications(store: &Store<Wry>) -> bool {
    let Some(timestamp) = store.get(APPLICATIONS_CONFIG.last_updated_timestamp_key) else {
        return false;
    };

    let Some(stored_time) = timestamp.as_i64() else {
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

fn refresh_applications_cache_in_background(app: AppHandle<Wry>) {
    if APPLICATIONS_REFRESH_IN_PROGRESS
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn_blocking(move || {
        let refresh_result = (|| -> Result<()> {
            let applications = collect_applications()?;
            let store = app
                .store(&APP_CONFIG.store_file_name)
                .map_err(|e| ApplicationsError::StoreOpeningError(e.to_string()))?;

            write_applications_cache(store, &applications)?;
            let _ = app.emit(APPLICATIONS_CONFIG.cache_updated_event, ());
            Ok(())
        })();

        if let Err(err) = refresh_result {
            eprintln!("beam: background applications refresh failed: {err}");
        }

        APPLICATIONS_REFRESH_IN_PROGRESS.store(false, Ordering::Release);
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

    let applications = collect_applications()?;
    write_applications_cache(store, &applications)?;

    Ok(applications)
}
