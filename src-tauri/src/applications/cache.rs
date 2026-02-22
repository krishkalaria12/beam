use jiff::Timestamp;
use serde_json::from_value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Wry};
use tauri_plugin_store::{Store, StoreExt};

use super::{
    app_entry::AppEntry,
    collector::collect_applications,
    error::{Error, Result},
};

use crate::config::config;

static APPLICATIONS_REFRESH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

fn should_use_cached_applications(store: &Store<Wry>) -> bool {
    let Some(timestamp) = store.get(config().LAST_UPDATED_APPLICATIONS_TIMESTAMP) else {
        return false;
    };

    let Some(stored_time) = timestamp.as_i64() else {
        return false;
    };

    let now = Timestamp::now().as_second();
    let diff_seconds = (config().TIMESTAMP_VALUE_DIFF as i64) * 86400;

    (now - stored_time) <= diff_seconds
}

fn read_cached_applications(store: &Store<Wry>) -> Option<Vec<AppEntry>> {
    let json_value = store.get(&config().APPLICATIONS_VALUE)?;
    from_value::<Vec<AppEntry>>(json_value).ok()
}

fn write_applications_cache(store: Arc<Store<Wry>>, applications: &[AppEntry]) -> Result<()> {
    let app_json =
        serde_json::to_value(applications).map_err(|e| Error::SerializationError(e.to_string()))?;
    let current_time = serde_json::to_value(Timestamp::now().as_second())
        .map_err(|e| Error::SerializationError(e.to_string()))?;

    store.set(config().APPLICATIONS_VALUE, app_json);
    store.set(config().LAST_UPDATED_APPLICATIONS_TIMESTAMP, current_time);
    store
        .save()
        .map_err(|e| Error::StoreSaveError(e.to_string()))?;

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
                .store(&config().STORE_NAME)
                .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

            write_applications_cache(store, &applications)?;
            let _ = app.emit(config().APPLICATIONS_CACHE_UPDATED_EVENT, ());
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
        .store(&config().STORE_NAME)
        .map_err(|e| Error::StoreOpeningError(e.to_string()))?;

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
