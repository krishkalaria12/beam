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
    pub CALCULATOR_HTTP_TIMEOUT_SECS: u64,
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

    // -- Translation
    pub TRANSLATION_API_BASE_URL: &'static str,
    pub TRANSLATION_LANGUAGES_ENDPOINT: &'static str,
    pub TRANSLATION_TRANSLATE_ENDPOINT: &'static str,
    pub TRANSLATION_DETECT_ENDPOINT: &'static str,
    pub TRANSLATION_HTTP_TIMEOUT_SECS: u64,
    pub TRANSLATION_AUTO_SOURCE_LANGUAGE: &'static str,
    pub TRANSLATION_DEFAULT_FORMAT: &'static str,
    pub TRANSLATION_MAX_LANGUAGE_CODE_LENGTH: usize,

    // -- Spotify
    pub SPOTIFY_ACCOUNTS_BASE_URL: &'static str,
    pub SPOTIFY_API_BASE_URL: &'static str,
    pub SPOTIFY_AUTHORIZE_ENDPOINT: &'static str,
    pub SPOTIFY_TOKEN_ENDPOINT: &'static str,
    pub SPOTIFY_ME_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_DEVICES_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_PLAY_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_PAUSE_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_NEXT_ENDPOINT: &'static str,
    pub SPOTIFY_PLAYER_PREVIOUS_ENDPOINT: &'static str,
    pub SPOTIFY_SEARCH_ENDPOINT: &'static str,
    pub SPOTIFY_HTTP_TIMEOUT_SECS: u64,
    pub SPOTIFY_PKCE_VERIFIER_RANDOM_BYTES: usize,
    pub SPOTIFY_STATE_RANDOM_BYTES: usize,
    pub SPOTIFY_PKCE_CHALLENGE_METHOD: &'static str,
    pub SPOTIFY_DEFAULT_SCOPES: Vec<&'static str>,
    pub SPOTIFY_DEFAULT_SEARCH_TYPES: Vec<&'static str>,
    pub SPOTIFY_SEARCH_DEFAULT_LIMIT: u8,
    pub SPOTIFY_SEARCH_MAX_LIMIT: u8,

    // -- Quicklinks
    pub QUICKLINK_STORE_NAME: &'static str,
    pub QUICKLINK_VALUE_NAME: &'static str,

    // -- Settings
    pub UI_LAYOUT_MODE_VALUE: &'static str,
    pub HOTKEY_GLOBAL_SHORTCUT_VALUE: &'static str,
    pub HOTKEY_COMMAND_HOTKEYS_VALUE: &'static str,
    pub HOTKEY_DEFAULT_GLOBAL_SHORTCUT: &'static str,
    pub HOTKEY_COMMAND_EVENT: &'static str,
    pub HOTKEY_SETTINGS_UPDATED_EVENT: &'static str,
    pub HOTKEY_BACKEND_STATUS_EVENT: &'static str,
    pub HOTKEY_PORTAL_LAUNCHER_SHORTCUT_ID: &'static str,
    pub HOTKEY_PORTAL_COMMAND_SHORTCUT_PREFIX: &'static str,
    pub HOTKEY_WAYLAND_FALLBACK_MESSAGE: &'static str,
    pub HOTKEY_WAYLAND_DISABLED_MESSAGE: &'static str,

    // -- Extensions
    pub EXTENSIONS_PLUGINS_DIRECTORY: &'static str,
    pub EXTENSIONS_PACKAGE_JSON_FILE: &'static str,
    pub EXTENSIONS_OAUTH_TOKENS_FILE: &'static str,
    pub EXTENSIONS_AI_SETTINGS_FILE: &'static str,
    pub EXTENSIONS_AI_KEYRING_SERVICE: &'static str,
    pub EXTENSIONS_AI_KEYRING_USERNAME: &'static str,
    pub EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL: &'static str,
    pub EXTENSIONS_HEURISTIC_MACOS_PATHS: Vec<&'static str>,

    // -- Script Commands
    pub SCRIPT_COMMANDS_DIRECTORY: &'static str,
    pub SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS: u64,
    pub SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS: u64,
    pub SCRIPT_COMMANDS_MAX_OUTPUT_BYTES: usize,

    // -- Pinned
    pub COMMAND_PINNED_KEY: &'static str,

    // -- Todo
    pub TODO_DIRECTORY: &'static str,
    pub TODO_DATABASE_FILE: &'static str,
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

            CALCULATOR_HTTP_TIMEOUT_SECS: 10,
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

            TRANSLATION_API_BASE_URL: "https://translate.googleapis.com",
            TRANSLATION_LANGUAGES_ENDPOINT: "/translate_a/l",
            TRANSLATION_TRANSLATE_ENDPOINT: "/translate_a/single",
            TRANSLATION_DETECT_ENDPOINT: "/translate_a/single",
            TRANSLATION_HTTP_TIMEOUT_SECS: 12,
            TRANSLATION_AUTO_SOURCE_LANGUAGE: "auto",
            TRANSLATION_DEFAULT_FORMAT: "text",
            TRANSLATION_MAX_LANGUAGE_CODE_LENGTH: 24,

            SPOTIFY_ACCOUNTS_BASE_URL: "https://accounts.spotify.com",
            SPOTIFY_API_BASE_URL: "https://api.spotify.com/v1",
            SPOTIFY_AUTHORIZE_ENDPOINT: "/authorize",
            SPOTIFY_TOKEN_ENDPOINT: "/api/token",
            SPOTIFY_ME_ENDPOINT: "/me",
            SPOTIFY_PLAYER_ENDPOINT: "/me/player",
            SPOTIFY_PLAYER_DEVICES_ENDPOINT: "/me/player/devices",
            SPOTIFY_PLAYER_PLAY_ENDPOINT: "/me/player/play",
            SPOTIFY_PLAYER_PAUSE_ENDPOINT: "/me/player/pause",
            SPOTIFY_PLAYER_NEXT_ENDPOINT: "/me/player/next",
            SPOTIFY_PLAYER_PREVIOUS_ENDPOINT: "/me/player/previous",
            SPOTIFY_SEARCH_ENDPOINT: "/search",
            SPOTIFY_HTTP_TIMEOUT_SECS: 15,
            SPOTIFY_PKCE_VERIFIER_RANDOM_BYTES: 48,
            SPOTIFY_STATE_RANDOM_BYTES: 24,
            SPOTIFY_PKCE_CHALLENGE_METHOD: "S256",
            SPOTIFY_DEFAULT_SCOPES: vec![
                "user-read-private",
                "user-read-email",
                "user-read-playback-state",
                "user-modify-playback-state",
                "user-read-currently-playing",
            ],
            SPOTIFY_DEFAULT_SEARCH_TYPES: vec!["track", "artist", "album"],
            SPOTIFY_SEARCH_DEFAULT_LIMIT: 20,
            SPOTIFY_SEARCH_MAX_LIMIT: 50,

            QUICKLINK_STORE_NAME: "quicklinks.json",
            QUICKLINK_VALUE_NAME: "quick_links",

            UI_LAYOUT_MODE_VALUE: "ui_layout_mode",
            HOTKEY_GLOBAL_SHORTCUT_VALUE: "hotkey_global_shortcut",
            HOTKEY_COMMAND_HOTKEYS_VALUE: "hotkey_command_hotkeys",
            HOTKEY_DEFAULT_GLOBAL_SHORTCUT: "SUPER+Space",
            HOTKEY_COMMAND_EVENT: "hotkey-command",
            HOTKEY_SETTINGS_UPDATED_EVENT: "hotkey-settings-updated",
            HOTKEY_BACKEND_STATUS_EVENT: "hotkey-backend-status",
            HOTKEY_PORTAL_LAUNCHER_SHORTCUT_ID: "beam.launcher.toggle",
            HOTKEY_PORTAL_COMMAND_SHORTCUT_PREFIX: "beam.command",
            HOTKEY_WAYLAND_FALLBACK_MESSAGE:
                "Global hotkeys are restricted by your compositor/portal setup.",
            HOTKEY_WAYLAND_DISABLED_MESSAGE:
                "Global hotkeys are disabled because this is not a Wayland session.",
            EXTENSIONS_PLUGINS_DIRECTORY: "plugins",
            EXTENSIONS_PACKAGE_JSON_FILE: "package.json",
            EXTENSIONS_OAUTH_TOKENS_FILE: "oauth_tokens.json",
            EXTENSIONS_AI_SETTINGS_FILE: "ai_settings.json",
            EXTENSIONS_AI_KEYRING_SERVICE: "dev.byteatatime.beam.ai",
            EXTENSIONS_AI_KEYRING_USERNAME: "openrouter_api_key",
            EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL: "runAppleScript",
            EXTENSIONS_HEURISTIC_MACOS_PATHS: vec!["/Applications/", "/Library/", "/Users/"],

            SCRIPT_COMMANDS_DIRECTORY: "script-commands",
            SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS: 12_000,
            SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS: 60_000,
            SCRIPT_COMMANDS_MAX_OUTPUT_BYTES: 2 * 1024 * 1024,

            COMMAND_PINNED_KEY: "command_pinned_ids",

            TODO_DIRECTORY: "todo",
            TODO_DATABASE_FILE: "todo.sqlite3",
        })
    }
}
