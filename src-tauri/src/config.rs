use parking_lot::{const_mutex, Mutex};

use crate::error::Result;

pub fn config() -> &'static Config {
    static INSTANCE: Mutex<Option<&'static Config>> = const_mutex(None);

    let mut instance = INSTANCE.lock();
    if let Some(config) = *instance {
        return config;
    }

    let config =
        Box::leak(Box::new(Config::load_the_config().unwrap_or_else(|ex| {
            panic!("FATAL - WHILE LOADING CONF - Cause: {ex:?}")
        })));

    *instance = Some(config);
    config
}

#[allow(non_snake_case)]
pub struct Config {
    // -- Web
    pub DIRECTORIES_APPLICATION: Vec<String>,
    pub DIRECTORIES_ICON: Vec<String>,
    pub SERVICE_NAME: &'static str,
    pub STORE_NAME: &'static str,
    pub LAST_UPDATED_APPLICATIONS_TIMESTAMP: &'static str,
    pub TIMESTAMP_VALUE_DIFF: usize,
    pub APPLICATIONS_VALUE: &'static str,
    pub APPLICATIONS_CACHE_UPDATED_EVENT: &'static str,
}

impl Config {
    fn load_the_config() -> Result<Config> {
        Ok(Config {
            DIRECTORIES_APPLICATION: vec![
                "~/.local/share/applications/".to_string(),
                "/usr/share/applications/".to_string(),
            ],
            DIRECTORIES_ICON: vec![
                "~/.local/share/icons".to_string(),
                "~/.icons".to_string(),
                "/usr/share/icons".to_string(),
                "/usr/local/share/icons".to_string(),
                "/usr/share/pixmaps".to_string(),
                "/var/lib/flatpak/exports/share/icons".to_string(),
                "/var/lib/snapd/desktop/icons".to_string(),
            ],
            SERVICE_NAME: "beam",
            STORE_NAME: "settings.json",
            APPLICATIONS_VALUE: "applications_cache",
            LAST_UPDATED_APPLICATIONS_TIMESTAMP: "last_updated_application_timestamp",
            TIMESTAMP_VALUE_DIFF: 2,
            APPLICATIONS_CACHE_UPDATED_EVENT: "applications-cache-updated",
        })
    }
}
