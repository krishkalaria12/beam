use std::sync::LazyLock;

use crate::error::Result;

static CONFIG: LazyLock<Config> = LazyLock::new(|| {
    Config::load_the_config()
        .unwrap_or_else(|ex| panic!("FATAL - WHILE LOADING CONF - Cause: {ex:?}"))
});

pub fn config() -> &'static Config {
    &CONFIG
}

#[allow(non_snake_case)]
pub struct Config {
    // -- Store
    pub DIRECTORIES_APPLICATION: Vec<String>,
    pub DIRECTORIES_ICON: Vec<String>,
    pub SERVICE_NAME: &'static str,
    pub STORE_NAME: &'static str,

    // -- Applications
    pub LAST_UPDATED_APPLICATIONS_TIMESTAMP: &'static str,
    pub TIMESTAMP_VALUE_DIFF: usize,
    pub APPLICATIONS_VALUE: &'static str,
    pub APPLICATIONS_CACHE_UPDATED_EVENT: &'static str,

    // -- Calculator
    pub CALCULATOR_CURRENCY_URL: &'static str,
    pub CURRENCY_COIN_URL: &'static str,
    pub CALCULATOR_CITY_TIME_URL: &'static str,
    pub CALCULATOR_HTTP_TIMEOUT_SECS: u64,
    pub CALCULATOR_REQUEST_WAIT_TIMEOUT_SECS: u64,
    pub CALCULATOR_REQUEST_POLL_INTERVAL_MS: u64,

    // -- Keyring
    pub KEYRING_NAME: &'static str,

    // -- Clipboard
    pub CLIPBOARD_HISTORY_VALUE: &'static str,
    pub CLIPBOARD_STORE_NAME: &'static str,
    pub CLIPBOARD_POLL_INTERVAL_MS: u64,
    pub CLIPBOARD_MAX_HISTORY_ENTRIES: usize,
    pub CLIPBOARD_MAX_ENTRY_BYTES: usize,
    pub CLIPBOARD_ENCRYPTION_PREFIX: &'static str,
    pub CLIPBOARD_ENCRYPTION_NONCE_BYTES: usize,
    pub CLIPBOARD_ENCRYPTION_PASSWORD_LENGTH: usize,
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

            CALCULATOR_CURRENCY_URL: "https://www.floatrates.com/daily/usd.json",
            CURRENCY_COIN_URL: "https://api.coincap.io/v2/assets",
            CALCULATOR_CITY_TIME_URL: "https://erhanbaris.github.io/jsons/cities.json",
            CALCULATOR_HTTP_TIMEOUT_SECS: 10,
            CALCULATOR_REQUEST_WAIT_TIMEOUT_SECS: 8,
            CALCULATOR_REQUEST_POLL_INTERVAL_MS: 20,

            KEYRING_NAME: "secret-key",

            CLIPBOARD_HISTORY_VALUE: "clipboard_history",
            CLIPBOARD_STORE_NAME: "clipboard_history.json",
            CLIPBOARD_POLL_INTERVAL_MS: 350,
            CLIPBOARD_MAX_HISTORY_ENTRIES: 100,
            CLIPBOARD_MAX_ENTRY_BYTES: 1_000_000,
            CLIPBOARD_ENCRYPTION_PREFIX: "beam:aesgcm:v1:",
            CLIPBOARD_ENCRYPTION_NONCE_BYTES: 12,
            CLIPBOARD_ENCRYPTION_PASSWORD_LENGTH: 64,
        })
    }
}
