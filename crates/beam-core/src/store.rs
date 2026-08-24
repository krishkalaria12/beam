//! Plain JSON key-value store, file-compatible with `tauri-plugin-store` v2.
//!
//! The Tauri build kept its stores as a single flat JSON object per file,
//! `{ "key": <value>, … }`, under the app data dir. This store reads and
//! writes exactly that shape at exactly those paths so every existing
//! `settings.json` keeps working across the upgrade.
//!
//! Divergence from the plugin (sanctioned by plan §05): writes persist
//! synchronously and atomically instead of relying on the plugin's debounced
//! auto-save. User-visible behaviour is unchanged; crash-safety improves.

use std::path::{Path, PathBuf};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{BeamError, Result};

/// The settings store both builds share. Keyed by `config::CONFIG.store_file_name`.
pub const STORE_FILE_NAME: &str = "settings.json";

pub struct JsonStore {
    path: PathBuf,
    state: Mutex<serde_json::Map<String, Value>>,
}

impl JsonStore {
    /// Opens (or creates) a store file. Missing or empty files start empty;
    /// malformed files are an error rather than silently reset data.
    pub fn open(path: impl Into<PathBuf>) -> Result<Self> {
        let path = path.into();
        let state = Self::load(&path)?;
        Ok(Self {
            path,
            state: Mutex::new(state),
        })
    }

    fn load(path: &Path) -> Result<serde_json::Map<String, Value>> {
        match std::fs::read_to_string(path) {
            Ok(contents) if contents.trim().is_empty() => Ok(serde_json::Map::new()),
            Ok(contents) => serde_json::from_str::<Value>(&contents)
                .map(|value| match value {
                    Value::Object(map) => map,
                    other => serde_json::Map::from_iter([(
                        String::new(),
                        other,
                    )]),
                })
                .map_err(|error| {
                    BeamError::store(format!(
                        "store file {} is corrupt: {error}",
                        path.display()
                    ))
                }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(serde_json::Map::new())
            }
            Err(error) => Err(error.into()),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        self.state.lock().get(key).cloned()
    }

    /// Deserialises a stored value into `T`.
    pub fn get_as<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>> {
        match self.get(key) {
            Some(value) => serde_json::from_value(value)
                .map(Some)
                .map_err(|error| BeamError::store(format!("key '{key}' has the wrong shape: {error}"))),
            None => Ok(None),
        }
    }

    /// Serialises `value`, stores it under `key` and persists the file.
    pub fn set<T: Serialize>(&self, key: &str, value: &T) -> Result<()> {
        let value = serde_json::to_value(value)?;
        let mut state = self.state.lock();
        state.insert(key.to_string(), value);
        drop(state);
        self.save()
    }

    /// Removes a key and persists the file. Returns the removed value.
    pub fn remove(&self, key: &str) -> Result<Option<Value>> {
        let removed = self.state.lock().remove(key);
        self.save()?;
        Ok(removed)
    }

    pub fn keys(&self) -> Vec<String> {
        self.state.lock().keys().cloned().collect()
    }

    /// Applies a batch of changes and persists once.
    pub fn update(
        &self,
        changes: impl IntoIterator<Item = (String, Value)>,
    ) -> Result<()> {
        let mut state = self.state.lock();
        for (key, value) in changes {
            state.insert(key, value);
        }
        drop(state);
        self.save()
    }

    /// Persists the current state atomically (write to a sibling temp file,
    /// then rename over the target).
    pub fn save(&self) -> Result<()> {
        let contents = {
            let state = self.state.lock();
            serde_json::to_string_pretty(&*state)?
        };

        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let temp_path = self.path.with_extension("json.tmp");
        std::fs::write(&temp_path, contents)?;
        std::fs::rename(&temp_path, &self.path)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp_store(name: &str) -> JsonStore {
        let dir = std::env::temp_dir().join(format!("beam-core-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(format!("{name}.json"));
        let _ = std::fs::remove_file(&path);
        JsonStore::open(path).unwrap()
    }

    #[test]
    fn round_trips_values() {
        let store = temp_store("round-trip");
        store.set("launcher_opacity", &0.42).unwrap();
        assert_eq!(store.get("launcher_opacity"), Some(json!(0.42)));
        let loaded: Option<f64> = store.get_as("launcher_opacity").unwrap();
        assert_eq!(loaded, Some(0.42));
    }

    #[test]
    fn persists_across_reopen() {
        let dir = std::env::temp_dir().join(format!("beam-core-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("reopen.json");
        let _ = std::fs::remove_file(&path);

        let store = JsonStore::open(&path).unwrap();
        store.set("hotkey_global_shortcut", &"SUPER+R").unwrap();
        drop(store);

        let reopened = JsonStore::open(&path).unwrap();
        assert_eq!(
            reopened.get("hotkey_global_shortcut"),
            Some(json!("SUPER+R"))
        );
    }

    #[test]
    fn reads_flat_object_files_from_the_tauri_plugin() {
        let dir = std::env::temp_dir().join(format!("beam-core-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("legacy.json");
        // Exactly what tauri-plugin-store v2 saves: one flat object.
        std::fs::write(&path, r#"{"launcher_opacity":1.0,"hotkey_global_shortcut":"SUPER+R"}"#)
            .unwrap();

        let store = JsonStore::open(&path).unwrap();
        assert_eq!(store.get("launcher_opacity"), Some(json!(1.0)));
        assert_eq!(store.keys().len(), 2);
    }

    #[test]
    fn missing_file_starts_empty_and_creates_on_save() {
        let store = temp_store("missing");
        assert!(store.get("anything").is_none());
        store.set("anything", &true).unwrap();
        assert_eq!(store.get("anything"), Some(json!(true)));
    }

    #[test]
    fn remove_deletes_and_persists() {
        let store = temp_store("remove");
        store.set("key", &"value").unwrap();
        let removed = store.remove("key").unwrap();
        assert_eq!(removed, Some(json!("value")));
        assert!(store.get("key").is_none());
    }
}
