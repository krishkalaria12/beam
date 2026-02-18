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
    pub CALCULATOR_HISTORY_VALUE: &'static str,
    pub CALCULATOR_STORE_NAME: &'static str,
    pub CALCULATOR_MAX_HISTORY_ENTRIES: usize,

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
    pub CLIPBOARD_SEARCH_MAX_RESULTS: usize,
    pub CLIPBOARD_SEARCH_MAX_ENTRY_CHARS: usize,
    pub CLIPBOARD_SEARCH_VALUE_WEIGHT: u32,
    pub CLIPBOARD_SEARCH_CONTENT_TYPE_WEIGHT: u32,

    // -- File
    pub FILE_DIRECTORIES_APPLICATION: Vec<String>,
    pub FILE_DIRECTORIES_ICON: Vec<String>,
    pub FILE_IGNORED_FOLDERS: Vec<&'static str>,
    pub FILE_WATCHER_DEBOUNCE_SEC: usize,

    // -- File Search
    pub FILE_SEARCH_DEFAULT_RESULTS_PER_PAGE: usize,
    pub FILE_SEARCH_MAX_RESULTS_PER_PAGE: usize,

    // -- Dictionary
    pub DICTIONARY_API_URL: &'static str,

    // -- Quicklinks
    pub QUICKLINK_STORE_NAME: &'static str,
    pub QUICKLINK_VALUE_NAME: &'static str,

    // -- Settings
    pub UI_LAYOUT_MODE_VALUE: &'static str,
}

impl Config {
    fn load_the_config() -> Result<Config> {
        Ok(Config {
            SERVICE_NAME: "beam",
            STORE_NAME: "settings.json",
            APPLICATIONS_VALUE: "applications_cache",
            LAST_UPDATED_APPLICATIONS_TIMESTAMP: "last_updated_application_timestamp",
            TIMESTAMP_VALUE_DIFF: 1,
            APPLICATIONS_CACHE_UPDATED_EVENT: "applications-cache-updated",

            CALCULATOR_CURRENCY_URL: "https://www.floatrates.com/daily/usd.json",
            CURRENCY_COIN_URL: "https://api.coincap.io/v2/assets",
            CALCULATOR_CITY_TIME_URL: "https://erhanbaris.github.io/jsons/cities.json",
            CALCULATOR_HTTP_TIMEOUT_SECS: 10,
            CALCULATOR_REQUEST_WAIT_TIMEOUT_SECS: 8,
            CALCULATOR_REQUEST_POLL_INTERVAL_MS: 20,
            CALCULATOR_HISTORY_VALUE: "calculator_history",
            CALCULATOR_STORE_NAME: "calculator_history.json",
            CALCULATOR_MAX_HISTORY_ENTRIES: 50,

            KEYRING_NAME: "secret-key",

            CLIPBOARD_HISTORY_VALUE: "clipboard_history",
            CLIPBOARD_STORE_NAME: "clipboard_history.json",
            CLIPBOARD_POLL_INTERVAL_MS: 350,
            CLIPBOARD_MAX_HISTORY_ENTRIES: 100,
            CLIPBOARD_MAX_ENTRY_BYTES: 1_000_000,
            CLIPBOARD_ENCRYPTION_PREFIX: "beam:aesgcm:v1:",
            CLIPBOARD_ENCRYPTION_NONCE_BYTES: 12,
            CLIPBOARD_ENCRYPTION_PASSWORD_LENGTH: 64,
            CLIPBOARD_SEARCH_MAX_RESULTS: 75,
            CLIPBOARD_SEARCH_MAX_ENTRY_CHARS: 4096,
            CLIPBOARD_SEARCH_VALUE_WEIGHT: 5,
            CLIPBOARD_SEARCH_CONTENT_TYPE_WEIGHT: 2,

            FILE_DIRECTORIES_APPLICATION: vec![
                "~/.local/share/applications/".to_string(),
                "/usr/share/applications/".to_string(),
            ],
            FILE_DIRECTORIES_ICON: vec![
                "~/.local/share/icons".to_string(),
                "~/.icons".to_string(),
                "/usr/share/icons".to_string(),
                "/usr/local/share/icons".to_string(),
                "/usr/share/pixmaps".to_string(),
                "/var/lib/flatpak/exports/share/icons".to_string(),
                "/var/lib/snapd/desktop/icons".to_string(),
            ],
            FILE_IGNORED_FOLDERS: vec![
                "node_modules",
                "target",
                "dist",
                "build",
                "vendor",
                ".git",
                "__pycache__",
                ".venv",
                "env",
                ".pytest_cache",
                ".gradle",
                ".idea",
                ".vs",
                "Debug",
                "Release",
                ".next",
                ".nuxt",
                ".sass-cache",
                "$RECYCLE.BIN",
                "System Volume Information",
                ".cache",
                ".cargo",
                ".rustup",
            ],
            FILE_WATCHER_DEBOUNCE_SEC: 1,

            FILE_SEARCH_DEFAULT_RESULTS_PER_PAGE: 20,
            FILE_SEARCH_MAX_RESULTS_PER_PAGE: 100,

            DICTIONARY_API_URL: "https://freedictionaryapi.com/api/v1/entries",

            QUICKLINK_STORE_NAME: "quicklinks.json",
            QUICKLINK_VALUE_NAME: "quick_links",

            UI_LAYOUT_MODE_VALUE: "ui_layout_mode",
        })
    }
}
