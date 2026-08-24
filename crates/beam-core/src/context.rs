//! `BeamContext` — what replaces the Tauri `AppHandle` as every service
//! function's first parameter (plan §05, de-Tauri contract):
//!
//! ```ignore
//! // before
//! pub fn get_setting(app: AppHandle, key: String) -> Result<Value, String>
//! // after
//! pub fn get_setting(cx: &BeamContext, key: &str) -> Result<Option<Value>, SettingsError>
//! ```
//!
//! The context is cheaply cloneable so it can also be moved into background
//! tasks and GPUI entities.

use std::sync::Arc;

use crate::error::Result;
use crate::events::{BeamEvent, EventBus};
use crate::paths::BeamPaths;
use crate::store::{JsonStore, STORE_FILE_NAME};

#[derive(Clone)]
pub struct BeamContext {
    paths: Arc<BeamPaths>,
    store: Arc<JsonStore>,
    events: EventBus,
}

impl BeamContext {
    /// Opens the context against the real user environment: resolves the
    /// asserted data directories, creates them if missing, and opens the
    /// shared settings store.
    pub fn open() -> Result<Self> {
        Self::with_paths(BeamPaths::resolve()?)
    }

    pub fn with_paths(paths: BeamPaths) -> Result<Self> {
        paths.ensure_directories()?;
        let store = JsonStore::open(paths.store_path(STORE_FILE_NAME))?;
        Ok(Self {
            paths: Arc::new(paths),
            store: Arc::new(store),
            events: EventBus::new(),
        })
    }

    pub fn paths(&self) -> &BeamPaths {
        &self.paths
    }

    /// The shared settings store (`settings.json`, tauri-plugin-store format).
    ///
    /// Domain modules with their own store files open additional
    /// [`JsonStore`]s under [`Self::paths`] — same files, same keys.
    pub fn settings(&self) -> &JsonStore {
        &self.store
    }

    pub fn events(&self) -> &EventBus {
        &self.events
    }

    /// Convenience for the common one-off notification.
    pub fn emit(&self, event: BeamEvent) {
        self.events.emit(event);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paths::HostPlatform;

    fn temp_context(name: &str) -> (BeamContext, BeamPaths) {
        let dir = std::env::temp_dir().join(format!("beam-core-ctx-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let home = dir.join(name);
        let _ = std::fs::remove_dir_all(&home);
        let paths = BeamPaths::from_platform(
            HostPlatform::Linux,
            Some(home.into()),
            None,
            None,
            None,
            None,
        )
        .unwrap();
        let context = BeamContext::with_paths(paths.clone()).unwrap();
        (context, paths)
    }

    #[test]
    fn creates_directories_and_store_file() {
        let (context, paths) = temp_context("creates");
        assert!(paths.data_dir().is_dir());
        assert!(paths.local_data_dir().is_dir());
        context.settings().set("key", &"value").unwrap();
        assert!(paths.store_path("settings.json").is_file());
    }

    #[test]
    fn settings_round_trip_and_events_flow() {
        let (context, _) = temp_context("roundtrip");
        let mut receiver = context.events().subscribe();

        context.settings().set("launcher_opacity", &0.5).unwrap();
        assert_eq!(
            context.settings().get("launcher_opacity"),
            Some(serde_json::json!(0.5))
        );

        context.emit(BeamEvent::LauncherResetToMain);
        assert!(receiver.try_recv().is_ok());
    }

    #[test]
    fn clone_shares_state() {
        let (context, _) = temp_context("clone");
        let clone = context.clone();
        clone.settings().set("k", &1).unwrap();
        assert_eq!(context.settings().get("k"), Some(serde_json::json!(1)));
    }
}
