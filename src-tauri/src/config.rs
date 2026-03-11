use std::sync::LazyLock;

use crate::error::Result;

static CONFIG: LazyLock<Config> = LazyLock::new(|| {
    Config::load_the_config()
        .unwrap_or_else(|ex| panic!("FATAL - WHILE LOADING CONF - Cause: {ex:?}"))
});

pub fn config() -> &'static Config {
    &CONFIG
}

const SERVICE_NAME: &str = "beam";
const STORE_NAME: &str = "settings.json";

const LAST_UPDATED_APPLICATIONS_TIMESTAMP: &str = "last_updated_application_timestamp";
const TIMESTAMP_VALUE_DIFF: usize = 1;
const APPLICATIONS_VALUE: &str = "applications_cache";
const APPLICATIONS_CACHE_UPDATED_EVENT: &str = "applications-cache-updated";

const CALCULATOR_HTTP_TIMEOUT_SECS: u64 = 10;
const CALCULATOR_HISTORY_VALUE: &str = "calculator_history";
const CALCULATOR_STORE_NAME: &str = "calculator_history.json";
const CALCULATOR_MAX_HISTORY_ENTRIES: usize = 50;

const KEYRING_NAME: &str = "secret-key";

const CLIPBOARD_HISTORY_VALUE: &str = "clipboard_history";
const CLIPBOARD_STORE_NAME: &str = "clipboard_history.json";
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 350;
const CLIPBOARD_MAX_HISTORY_ENTRIES: usize = 100;
const CLIPBOARD_MAX_ENTRY_BYTES: usize = 1_000_000;
const CLIPBOARD_ENCRYPTION_PREFIX: &str = "beam:aesgcm:v1:";
const CLIPBOARD_ENCRYPTION_NONCE_BYTES: usize = 12;
const CLIPBOARD_ENCRYPTION_PASSWORD_LENGTH: usize = 64;
const CLIPBOARD_SEARCH_MAX_RESULTS: usize = 75;
const CLIPBOARD_SEARCH_MAX_ENTRY_CHARS: usize = 4096;
const CLIPBOARD_SEARCH_VALUE_WEIGHT: u32 = 5;
const CLIPBOARD_SEARCH_CONTENT_TYPE_WEIGHT: u32 = 2;

const FILE_DIRECTORIES_APPLICATION: &[&str] =
    &["~/.local/share/applications/", "/usr/share/applications/"];
const FILE_DIRECTORIES_ICON: &[&str] = &[
    "~/.local/share/icons",
    "~/.icons",
    "/usr/share/icons",
    "/usr/local/share/icons",
    "/usr/share/pixmaps",
    "/var/lib/flatpak/exports/share/icons",
    "/var/lib/snapd/desktop/icons",
];
const FILE_IGNORED_FOLDERS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".build",
    "out",
    ".out",
    "coverage",
    ".coverage",
    ".nyc_output",
    "vendor",
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    ".env",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".nox",
    ".hypothesis",
    ".ipynb_checkpoints",
    ".gradle",
    ".idea",
    ".vscode",
    ".vs",
    "Debug",
    "Release",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".parcel-cache",
    ".turbo",
    ".yarn",
    ".pnpm-store",
    ".npm",
    ".bun",
    ".direnv",
    ".dart_tool",
    ".terraform",
    ".serverless",
    ".aws-sam",
    ".vercel",
    ".output",
    ".angular",
    ".history",
    ".Trash",
    "Trash",
    "tmp",
    "temp",
    ".sass-cache",
    "$RECYCLE.BIN",
    "System Volume Information",
    ".cache",
    ".cargo",
    ".rustup",
];
const FILE_IGNORED_FILES: &[&str] = &[
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    "Icon\r",
    ".localized",
    ".eslintcache",
    ".stylelintcache",
];
const FILE_CACHE_FLUSH_DEBOUNCE_MS: u64 = 2_000;
const FILE_WATCHER_DEBOUNCE_SEC: usize = 1;

const FILE_SEARCH_DEFAULT_RESULTS_PER_PAGE: usize = 20;
const FILE_SEARCH_MAX_RESULTS_PER_PAGE: usize = 100;

const DICTIONARY_API_URL: &str = "https://freedictionaryapi.com/api/v1/entries";

const TRANSLATION_API_BASE_URL: &str = "https://translate.googleapis.com";
const TRANSLATION_LANGUAGES_ENDPOINT: &str = "/translate_a/l";
const TRANSLATION_TRANSLATE_ENDPOINT: &str = "/translate_a/single";
const TRANSLATION_DETECT_ENDPOINT: &str = "/translate_a/single";
const TRANSLATION_HTTP_TIMEOUT_SECS: u64 = 12;
const TRANSLATION_AUTO_SOURCE_LANGUAGE: &str = "auto";
const TRANSLATION_DEFAULT_FORMAT: &str = "text";
const TRANSLATION_MAX_LANGUAGE_CODE_LENGTH: usize = 24;

const INTEGRATIONS_HTTP_TIMEOUT_SECS: u64 = 15;
const INTEGRATIONS_PKCE_VERIFIER_RANDOM_BYTES: usize = 48;
const INTEGRATIONS_STATE_RANDOM_BYTES: usize = 24;
const INTEGRATIONS_PKCE_CHALLENGE_METHOD: &str = "S256";

const SPOTIFY_AUTHORIZE_URL: &str = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL: &str = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL: &str = "https://api.spotify.com/v1/me";
const SPOTIFY_PLAYER_URL: &str = "https://api.spotify.com/v1/me/player";
const SPOTIFY_PLAYER_DEVICES_URL: &str = "https://api.spotify.com/v1/me/player/devices";
const SPOTIFY_PLAYER_PLAY_URL: &str = "https://api.spotify.com/v1/me/player/play";
const SPOTIFY_PLAYER_PAUSE_URL: &str = "https://api.spotify.com/v1/me/player/pause";
const SPOTIFY_PLAYER_NEXT_URL: &str = "https://api.spotify.com/v1/me/player/next";
const SPOTIFY_PLAYER_PREVIOUS_URL: &str = "https://api.spotify.com/v1/me/player/previous";
const SPOTIFY_SEARCH_URL: &str = "https://api.spotify.com/v1/search";
const SPOTIFY_DEFAULT_SCOPES: &[&str] = &[
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
];
const SPOTIFY_DEFAULT_SEARCH_TYPES: &[&str] = &["track", "artist", "album"];
const SPOTIFY_SEARCH_DEFAULT_LIMIT: u8 = 20;
const SPOTIFY_SEARCH_MAX_LIMIT: u8 = 50;

const GITHUB_AUTHORIZE_URL: &str = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL: &str = "https://api.github.com/user";
const GITHUB_ISSUES_URL: &str = "https://api.github.com/issues";
const GITHUB_SEARCH_ISSUES_URL: &str = "https://api.github.com/search/issues";
const GITHUB_API_VERSION: &str = "2022-11-28";
const GITHUB_USER_AGENT: &str = "beam-desktop";
const GITHUB_DEFAULT_SCOPES: &[&str] = &["read:user", "repo", "read:org", "notifications"];
const GITHUB_DEFAULT_ISSUES_FILTER: &str = "assigned";
const GITHUB_DEFAULT_ISSUES_STATE: &str = "open";
const GITHUB_DEFAULT_ISSUES_SORT: &str = "updated";
const GITHUB_DEFAULT_ISSUES_DIRECTION: &str = "desc";
const GITHUB_DEFAULT_ISSUES_PER_PAGE: u8 = 20;
const GITHUB_MAX_ISSUES_PER_PAGE: u8 = 100;

const QUICKLINK_STORE_NAME: &str = "quicklinks.json";
const QUICKLINK_VALUE_NAME: &str = "quick_links";

const UI_LAYOUT_MODE_VALUE: &str = "ui_layout_mode";
const HOTKEY_GLOBAL_SHORTCUT_VALUE: &str = "hotkey_global_shortcut";
const HOTKEY_COMMAND_HOTKEYS_VALUE: &str = "hotkey_command_hotkeys";
const HOTKEY_DEFAULT_GLOBAL_SHORTCUT: &str = "SUPER+Space";
const HOTKEY_COMMAND_EVENT: &str = "hotkey-command";
const HOTKEY_SETTINGS_UPDATED_EVENT: &str = "hotkey-settings-updated";
const HOTKEY_BACKEND_STATUS_EVENT: &str = "hotkey-backend-status";
const HOTKEY_PORTAL_LAUNCHER_SHORTCUT_ID: &str = "beam.launcher.toggle";
const HOTKEY_PORTAL_COMMAND_SHORTCUT_PREFIX: &str = "beam.command";
const HOTKEY_WAYLAND_FALLBACK_MESSAGE: &str =
    "Global hotkeys are restricted by your compositor/portal setup.";
const HOTKEY_WAYLAND_DISABLED_MESSAGE: &str =
    "Global hotkeys are disabled because this is not a Wayland session.";

const AI_DIRECTORY: &str = "ai";
const AI_ATTACHMENTS_DIRECTORY: &str = "attachments";
const AI_DATABASE_FILE: &str = "chat.sqlite3";
const AI_DEFAULT_CONVERSATION_ID: &str = "default";
const AI_CHAT_HISTORY_DEFAULT_LIMIT: u32 = 200;
const AI_CHAT_HISTORY_MAX_LIMIT: u32 = 1000;
const AI_SETTINGS_FILE: &str = "ai_settings.json";
const AI_KEYRING_SERVICE: &str = "dev.byteatatime.beam.ai";
const AI_OPENROUTER_KEYRING_USERNAME: &str = "openrouter_api_key";
const AI_OPENAI_KEYRING_USERNAME: &str = "openai_api_key";
const AI_ANTHROPIC_KEYRING_USERNAME: &str = "anthropic_api_key";
const AI_GEMINI_KEYRING_USERNAME: &str = "gemini_api_key";
const AI_DEFAULT_OPENROUTER_MODEL: &str = "moonshotai/kimi-k2.5";
const AI_DEFAULT_OPENAI_MODEL: &str = "gpt-5.2-2025-12-11";
const AI_DEFAULT_ANTHROPIC_MODEL: &str = "claude-sonnet-4-6";
const AI_DEFAULT_GEMINI_MODEL: &str = "gemini-3-flash-preview";
const AI_DEFAULT_OPENAI_REASONING_EFFORT: &str = "medium";
const AI_OPENAI_CONTEXT_WINDOW_TOKENS: u64 = 400_000;
const AI_OPENAI_MAX_OUTPUT_TOKENS: u64 = 128_000;
const AI_GEMINI_CONTEXT_WINDOW_TOKENS: u64 = 1_000_000;
const AI_GEMINI_MAX_OUTPUT_TOKENS: u64 = 64_000;
const AI_ANTHROPIC_CONTEXT_WINDOW_TOKENS: u64 = 200_000;
const AI_ANTHROPIC_MAX_OUTPUT_TOKENS: u64 = 64_000;
const AI_OPENROUTER_CONTEXT_WINDOW_TOKENS: u64 = 200_000;
const AI_OPENROUTER_MAX_OUTPUT_TOKENS: u64 = 64_000;
const AI_CONTEXT_ESTIMATED_CHARS_PER_TOKEN: usize = 4;
const AI_CONTEXT_MESSAGE_OVERHEAD_TOKENS: u64 = 24;
const AI_CONTEXT_INPUT_HEADROOM_TOKENS: u64 = 4_096;
const AI_CONTEXT_MESSAGES_LIMIT: u32 = 400;
const AI_CONTEXT_KEEP_RECENT_MESSAGES: u32 = 24;
const AI_CONTEXT_MIN_MESSAGES_TO_COMPACT: u32 = 8;
const AI_CONTEXT_MAX_COMPACTION_PASSES: u32 = 2;
const AI_MAX_ATTACHMENTS: usize = 8;
const AI_MAX_ATTACHMENT_BASE64_BYTES: usize = 25 * 1024 * 1024;

const EXTENSIONS_PLUGINS_DIRECTORY: &str = "plugins";
const EXTENSIONS_PACKAGE_JSON_FILE: &str = "package.json";
const EXTENSIONS_OAUTH_TOKENS_FILE: &str = "oauth_tokens.json";
const EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL: &str = "runAppleScript";
const EXTENSIONS_HEURISTIC_MACOS_PATHS: &[&str] = &["/Applications/", "/Library/", "/Users/"];
const EXTENSIONS_BROWSER_BRIDGE_HOST: &str = "127.0.0.1";
const EXTENSIONS_BROWSER_BRIDGE_PORT: u16 = 38957;
const EXTENSIONS_BROWSER_BRIDGE_STALE_SECONDS: u64 = 45;
const EXTENSIONS_BROWSER_BRIDGE_MAX_BODY_BYTES: usize = 2 * 1024 * 1024;
const EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS: usize = 200_000;
const CLI_BRIDGE_HOST: &str = "127.0.0.1";
const CLI_BRIDGE_PORT: u16 = 38958;
const CLI_DMENU_REQUEST_EVENT: &str = "cli-dmenu-request";

const SCRIPT_COMMANDS_DIRECTORY: &str = "script-commands";
const SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS: u64 = 12_000;
const SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS: u64 = 60_000;
const SCRIPT_COMMANDS_MAX_OUTPUT_BYTES: usize = 2 * 1024 * 1024;

const LAUNCHER_SHELL_DEFAULT_TIMEOUT_MS: u64 = 15_000;
const LAUNCHER_SHELL_MAX_TIMEOUT_MS: u64 = 120_000;
const LAUNCHER_SHELL_POLL_INTERVAL_MS: u64 = 25;

const COMMAND_PINNED_KEY: &str = "command_pinned_ids";

const TODO_DIRECTORY: &str = "todo";
const TODO_DATABASE_FILE: &str = "todo.sqlite3";

const NOTES_DIRECTORY: &str = "notes";
const NOTES_DATABASE_FILE: &str = "notes.sqlite3";

const SNIPPETS_DIRECTORY: &str = "snippets";
const SNIPPETS_DATABASE_FILE: &str = "snippets.sqlite3";
const SNIPPETS_DEFAULT_COOLDOWN_MS: u64 = 120;
const SNIPPETS_DEFAULT_MAX_BUFFER_LEN: usize = 96;
const SNIPPETS_MIN_MAX_BUFFER_LEN: usize = 8;
const SNIPPETS_MAX_MAX_BUFFER_LEN: usize = 512;

const WINDOW_SWITCHER_PROCESS_CACHE_REFRESH_MS: u64 = 2_000;

const LINUX_DESKTOP_GNOME_DBUS_DEST: &str = "org.gnome.Shell";
const LINUX_DESKTOP_GNOME_DBUS_PATH: &str = "/org/gnome/Shell/Extensions/Beam";
const LINUX_DESKTOP_GNOME_DBUS_INTERFACE: &str = "org.gnome.Shell.Extensions.Beam";
const LINUX_DESKTOP_GNOME_EXTENSION_ID: &str = "beam@beam-linux";
const LINUX_DESKTOP_GNOME_EXTENSION_METADATA_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/metadata.json"
));
const LINUX_DESKTOP_GNOME_EXTENSION_JS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/extension.js"
));
const LINUX_DESKTOP_GNOME_EXTENSION_STYLESHEET_CSS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../desktop-integrations/gnome-shell/beam@beam-linux/stylesheet.css"
));
const LINUX_DESKTOP_HYPR_WINDOW_ID_PREFIX: &str = "hypr:";
const LINUX_DESKTOP_SWAY_WINDOW_ID_PREFIX: &str = "sway:";

const LAUNCHER_THEME_DIR_NAME: &str = "themes";
const LAUNCHER_THEME_MANIFEST_FILE_NAME: &str = "theme.json";
const LAUNCHER_THEME_STYLESHEET_FILE_NAME: &str = "theme.css";
const LAUNCHER_THEME_SELECTED_KEY: &str = "launcher_theme_id";
const LAUNCHER_THEME_MAX_CSS_BYTES: usize = 512 * 1024;

const COMMAND_ITEMS_CONFIG: &str = "hidden_command_ids";

fn owned_strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_string()).collect()
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
    pub FILE_IGNORED_FILES: Vec<&'static str>,
    pub FILE_CACHE_FLUSH_DEBOUNCE_MS: u64,
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

    // -- Integrations (shared)
    pub INTEGRATIONS_HTTP_TIMEOUT_SECS: u64,
    pub INTEGRATIONS_PKCE_VERIFIER_RANDOM_BYTES: usize,
    pub INTEGRATIONS_STATE_RANDOM_BYTES: usize,
    pub INTEGRATIONS_PKCE_CHALLENGE_METHOD: &'static str,

    // -- Spotify
    pub SPOTIFY_AUTHORIZE_URL: &'static str,
    pub SPOTIFY_TOKEN_URL: &'static str,
    pub SPOTIFY_ME_URL: &'static str,
    pub SPOTIFY_PLAYER_URL: &'static str,
    pub SPOTIFY_PLAYER_DEVICES_URL: &'static str,
    pub SPOTIFY_PLAYER_PLAY_URL: &'static str,
    pub SPOTIFY_PLAYER_PAUSE_URL: &'static str,
    pub SPOTIFY_PLAYER_NEXT_URL: &'static str,
    pub SPOTIFY_PLAYER_PREVIOUS_URL: &'static str,
    pub SPOTIFY_SEARCH_URL: &'static str,
    pub SPOTIFY_DEFAULT_SCOPES: Vec<&'static str>,
    pub SPOTIFY_DEFAULT_SEARCH_TYPES: Vec<&'static str>,
    pub SPOTIFY_SEARCH_DEFAULT_LIMIT: u8,
    pub SPOTIFY_SEARCH_MAX_LIMIT: u8,

    // -- GitHub
    pub GITHUB_AUTHORIZE_URL: &'static str,
    pub GITHUB_TOKEN_URL: &'static str,
    pub GITHUB_USER_URL: &'static str,
    pub GITHUB_ISSUES_URL: &'static str,
    pub GITHUB_SEARCH_ISSUES_URL: &'static str,
    pub GITHUB_API_VERSION: &'static str,
    pub GITHUB_USER_AGENT: &'static str,
    pub GITHUB_DEFAULT_SCOPES: Vec<&'static str>,
    pub GITHUB_DEFAULT_ISSUES_FILTER: &'static str,
    pub GITHUB_DEFAULT_ISSUES_STATE: &'static str,
    pub GITHUB_DEFAULT_ISSUES_SORT: &'static str,
    pub GITHUB_DEFAULT_ISSUES_DIRECTION: &'static str,
    pub GITHUB_DEFAULT_ISSUES_PER_PAGE: u8,
    pub GITHUB_MAX_ISSUES_PER_PAGE: u8,

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

    // -- AI
    pub AI_DIRECTORY: &'static str,
    pub AI_ATTACHMENTS_DIRECTORY: &'static str,
    pub AI_DATABASE_FILE: &'static str,
    pub AI_DEFAULT_CONVERSATION_ID: &'static str,
    pub AI_CHAT_HISTORY_DEFAULT_LIMIT: u32,
    pub AI_CHAT_HISTORY_MAX_LIMIT: u32,
    pub AI_SETTINGS_FILE: &'static str,
    pub AI_KEYRING_SERVICE: &'static str,
    pub AI_OPENROUTER_KEYRING_USERNAME: &'static str,
    pub AI_OPENAI_KEYRING_USERNAME: &'static str,
    pub AI_ANTHROPIC_KEYRING_USERNAME: &'static str,
    pub AI_GEMINI_KEYRING_USERNAME: &'static str,
    pub AI_DEFAULT_OPENROUTER_MODEL: &'static str,
    pub AI_DEFAULT_OPENAI_MODEL: &'static str,
    pub AI_DEFAULT_ANTHROPIC_MODEL: &'static str,
    pub AI_DEFAULT_GEMINI_MODEL: &'static str,
    pub AI_DEFAULT_OPENAI_REASONING_EFFORT: &'static str,
    pub AI_OPENAI_CONTEXT_WINDOW_TOKENS: u64,
    pub AI_OPENAI_MAX_OUTPUT_TOKENS: u64,
    pub AI_GEMINI_CONTEXT_WINDOW_TOKENS: u64,
    pub AI_GEMINI_MAX_OUTPUT_TOKENS: u64,
    pub AI_ANTHROPIC_CONTEXT_WINDOW_TOKENS: u64,
    pub AI_ANTHROPIC_MAX_OUTPUT_TOKENS: u64,
    pub AI_OPENROUTER_CONTEXT_WINDOW_TOKENS: u64,
    pub AI_OPENROUTER_MAX_OUTPUT_TOKENS: u64,
    pub AI_CONTEXT_ESTIMATED_CHARS_PER_TOKEN: usize,
    pub AI_CONTEXT_MESSAGE_OVERHEAD_TOKENS: u64,
    pub AI_CONTEXT_INPUT_HEADROOM_TOKENS: u64,
    pub AI_CONTEXT_MESSAGES_LIMIT: u32,
    pub AI_CONTEXT_KEEP_RECENT_MESSAGES: u32,
    pub AI_CONTEXT_MIN_MESSAGES_TO_COMPACT: u32,
    pub AI_CONTEXT_MAX_COMPACTION_PASSES: u32,
    pub AI_MAX_ATTACHMENTS: usize,
    pub AI_MAX_ATTACHMENT_BASE64_BYTES: usize,

    // -- Extensions
    pub EXTENSIONS_PLUGINS_DIRECTORY: &'static str,
    pub EXTENSIONS_PACKAGE_JSON_FILE: &'static str,
    pub EXTENSIONS_OAUTH_TOKENS_FILE: &'static str,
    pub EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL: &'static str,
    pub EXTENSIONS_HEURISTIC_MACOS_PATHS: Vec<&'static str>,
    pub EXTENSIONS_BROWSER_BRIDGE_HOST: &'static str,
    pub EXTENSIONS_BROWSER_BRIDGE_PORT: u16,
    pub EXTENSIONS_BROWSER_BRIDGE_STALE_SECONDS: u64,
    pub EXTENSIONS_BROWSER_BRIDGE_MAX_BODY_BYTES: usize,
    pub EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS: usize,
    pub CLI_BRIDGE_HOST: &'static str,
    pub CLI_BRIDGE_PORT: u16,
    pub CLI_DMENU_REQUEST_EVENT: &'static str,

    // -- Script Commands
    pub SCRIPT_COMMANDS_DIRECTORY: &'static str,
    pub SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS: u64,
    pub SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS: u64,
    pub SCRIPT_COMMANDS_MAX_OUTPUT_BYTES: usize,

    // -- Launcher Shell
    pub LAUNCHER_SHELL_DEFAULT_TIMEOUT_MS: u64,
    pub LAUNCHER_SHELL_MAX_TIMEOUT_MS: u64,
    pub LAUNCHER_SHELL_POLL_INTERVAL_MS: u64,

    // -- Pinned
    pub COMMAND_PINNED_KEY: &'static str,

    // -- Todo
    pub TODO_DIRECTORY: &'static str,
    pub TODO_DATABASE_FILE: &'static str,

    // -- Notes
    pub NOTES_DIRECTORY: &'static str,
    pub NOTES_DATABASE_FILE: &'static str,

    // -- Snippets
    pub SNIPPETS_DIRECTORY: &'static str,
    pub SNIPPETS_DATABASE_FILE: &'static str,
    pub SNIPPETS_DEFAULT_COOLDOWN_MS: u64,
    pub SNIPPETS_DEFAULT_MAX_BUFFER_LEN: usize,
    pub SNIPPETS_MIN_MAX_BUFFER_LEN: usize,
    pub SNIPPETS_MAX_MAX_BUFFER_LEN: usize,

    // -- Window Switcher
    pub WINDOW_SWITCHER_PROCESS_CACHE_REFRESH_MS: u64,

    // -- Linux Desktop
    pub LINUX_DESKTOP_GNOME_DBUS_DEST: &'static str,
    pub LINUX_DESKTOP_GNOME_DBUS_PATH: &'static str,
    pub LINUX_DESKTOP_GNOME_DBUS_INTERFACE: &'static str,
    pub LINUX_DESKTOP_GNOME_EXTENSION_ID: &'static str,
    pub LINUX_DESKTOP_GNOME_EXTENSION_METADATA_JSON: &'static str,
    pub LINUX_DESKTOP_GNOME_EXTENSION_JS: &'static str,
    pub LINUX_DESKTOP_GNOME_EXTENSION_STYLESHEET_CSS: &'static str,
    pub LINUX_DESKTOP_HYPR_WINDOW_ID_PREFIX: &'static str,
    pub LINUX_DESKTOP_SWAY_WINDOW_ID_PREFIX: &'static str,

    // -- Launcher Theme
    pub LAUNCHER_THEME_DIR_NAME: &'static str,
    pub LAUNCHER_THEME_MANIFEST_FILE_NAME: &'static str,
    pub LAUNCHER_THEME_STYLESHEET_FILE_NAME: &'static str,
    pub LAUNCHER_THEME_SELECTED_KEY: &'static str,
    pub LAUNCHER_THEME_MAX_CSS_BYTES: usize,

    // -- Custom config
    pub COMMAND_ITEMS_CONFIG: &'static str,
}

impl Config {
    fn load_the_config() -> Result<Config> {
        Ok(Config {
            SERVICE_NAME,
            STORE_NAME,
            APPLICATIONS_VALUE,
            LAST_UPDATED_APPLICATIONS_TIMESTAMP,
            TIMESTAMP_VALUE_DIFF,
            APPLICATIONS_CACHE_UPDATED_EVENT,

            CALCULATOR_HTTP_TIMEOUT_SECS,
            CALCULATOR_HISTORY_VALUE,
            CALCULATOR_STORE_NAME,
            CALCULATOR_MAX_HISTORY_ENTRIES,

            KEYRING_NAME,

            CLIPBOARD_HISTORY_VALUE,
            CLIPBOARD_STORE_NAME,
            CLIPBOARD_POLL_INTERVAL_MS,
            CLIPBOARD_MAX_HISTORY_ENTRIES,
            CLIPBOARD_MAX_ENTRY_BYTES,
            CLIPBOARD_ENCRYPTION_PREFIX,
            CLIPBOARD_ENCRYPTION_NONCE_BYTES,
            CLIPBOARD_ENCRYPTION_PASSWORD_LENGTH,
            CLIPBOARD_SEARCH_MAX_RESULTS,
            CLIPBOARD_SEARCH_MAX_ENTRY_CHARS,
            CLIPBOARD_SEARCH_VALUE_WEIGHT,
            CLIPBOARD_SEARCH_CONTENT_TYPE_WEIGHT,

            FILE_DIRECTORIES_APPLICATION: owned_strings(FILE_DIRECTORIES_APPLICATION),
            FILE_DIRECTORIES_ICON: owned_strings(FILE_DIRECTORIES_ICON),
            FILE_IGNORED_FOLDERS: FILE_IGNORED_FOLDERS.to_vec(),
            FILE_IGNORED_FILES: FILE_IGNORED_FILES.to_vec(),
            FILE_CACHE_FLUSH_DEBOUNCE_MS,
            FILE_WATCHER_DEBOUNCE_SEC,

            FILE_SEARCH_DEFAULT_RESULTS_PER_PAGE,
            FILE_SEARCH_MAX_RESULTS_PER_PAGE,

            DICTIONARY_API_URL,

            TRANSLATION_API_BASE_URL,
            TRANSLATION_LANGUAGES_ENDPOINT,
            TRANSLATION_TRANSLATE_ENDPOINT,
            TRANSLATION_DETECT_ENDPOINT,
            TRANSLATION_HTTP_TIMEOUT_SECS,
            TRANSLATION_AUTO_SOURCE_LANGUAGE,
            TRANSLATION_DEFAULT_FORMAT,
            TRANSLATION_MAX_LANGUAGE_CODE_LENGTH,

            INTEGRATIONS_HTTP_TIMEOUT_SECS,
            INTEGRATIONS_PKCE_VERIFIER_RANDOM_BYTES,
            INTEGRATIONS_STATE_RANDOM_BYTES,
            INTEGRATIONS_PKCE_CHALLENGE_METHOD,

            SPOTIFY_AUTHORIZE_URL,
            SPOTIFY_TOKEN_URL,
            SPOTIFY_ME_URL,
            SPOTIFY_PLAYER_URL,
            SPOTIFY_PLAYER_DEVICES_URL,
            SPOTIFY_PLAYER_PLAY_URL,
            SPOTIFY_PLAYER_PAUSE_URL,
            SPOTIFY_PLAYER_NEXT_URL,
            SPOTIFY_PLAYER_PREVIOUS_URL,
            SPOTIFY_SEARCH_URL,
            SPOTIFY_DEFAULT_SCOPES: SPOTIFY_DEFAULT_SCOPES.to_vec(),
            SPOTIFY_DEFAULT_SEARCH_TYPES: SPOTIFY_DEFAULT_SEARCH_TYPES.to_vec(),
            SPOTIFY_SEARCH_DEFAULT_LIMIT,
            SPOTIFY_SEARCH_MAX_LIMIT,

            GITHUB_AUTHORIZE_URL,
            GITHUB_TOKEN_URL,
            GITHUB_USER_URL,
            GITHUB_ISSUES_URL,
            GITHUB_SEARCH_ISSUES_URL,
            GITHUB_API_VERSION,
            GITHUB_USER_AGENT,
            GITHUB_DEFAULT_SCOPES: GITHUB_DEFAULT_SCOPES.to_vec(),
            GITHUB_DEFAULT_ISSUES_FILTER,
            GITHUB_DEFAULT_ISSUES_STATE,
            GITHUB_DEFAULT_ISSUES_SORT,
            GITHUB_DEFAULT_ISSUES_DIRECTION,
            GITHUB_DEFAULT_ISSUES_PER_PAGE,
            GITHUB_MAX_ISSUES_PER_PAGE,

            QUICKLINK_STORE_NAME,
            QUICKLINK_VALUE_NAME,

            UI_LAYOUT_MODE_VALUE,
            HOTKEY_GLOBAL_SHORTCUT_VALUE,
            HOTKEY_COMMAND_HOTKEYS_VALUE,
            HOTKEY_DEFAULT_GLOBAL_SHORTCUT,
            HOTKEY_COMMAND_EVENT,
            HOTKEY_SETTINGS_UPDATED_EVENT,
            HOTKEY_BACKEND_STATUS_EVENT,
            HOTKEY_PORTAL_LAUNCHER_SHORTCUT_ID,
            HOTKEY_PORTAL_COMMAND_SHORTCUT_PREFIX,
            HOTKEY_WAYLAND_FALLBACK_MESSAGE,
            HOTKEY_WAYLAND_DISABLED_MESSAGE,
            AI_DIRECTORY,
            AI_ATTACHMENTS_DIRECTORY,
            AI_DATABASE_FILE,
            AI_DEFAULT_CONVERSATION_ID,
            AI_CHAT_HISTORY_DEFAULT_LIMIT,
            AI_CHAT_HISTORY_MAX_LIMIT,
            AI_SETTINGS_FILE,
            AI_KEYRING_SERVICE,
            AI_OPENROUTER_KEYRING_USERNAME,
            AI_OPENAI_KEYRING_USERNAME,
            AI_ANTHROPIC_KEYRING_USERNAME,
            AI_GEMINI_KEYRING_USERNAME,
            AI_DEFAULT_OPENROUTER_MODEL,
            AI_DEFAULT_OPENAI_MODEL,
            AI_DEFAULT_ANTHROPIC_MODEL,
            AI_DEFAULT_GEMINI_MODEL,
            AI_DEFAULT_OPENAI_REASONING_EFFORT,
            AI_OPENAI_CONTEXT_WINDOW_TOKENS,
            AI_OPENAI_MAX_OUTPUT_TOKENS,
            AI_GEMINI_CONTEXT_WINDOW_TOKENS,
            AI_GEMINI_MAX_OUTPUT_TOKENS,
            AI_ANTHROPIC_CONTEXT_WINDOW_TOKENS,
            AI_ANTHROPIC_MAX_OUTPUT_TOKENS,
            AI_OPENROUTER_CONTEXT_WINDOW_TOKENS,
            AI_OPENROUTER_MAX_OUTPUT_TOKENS,
            AI_CONTEXT_ESTIMATED_CHARS_PER_TOKEN,
            AI_CONTEXT_MESSAGE_OVERHEAD_TOKENS,
            AI_CONTEXT_INPUT_HEADROOM_TOKENS,
            AI_CONTEXT_MESSAGES_LIMIT,
            AI_CONTEXT_KEEP_RECENT_MESSAGES,
            AI_CONTEXT_MIN_MESSAGES_TO_COMPACT,
            AI_CONTEXT_MAX_COMPACTION_PASSES,
            AI_MAX_ATTACHMENTS,
            AI_MAX_ATTACHMENT_BASE64_BYTES,
            EXTENSIONS_PLUGINS_DIRECTORY,
            EXTENSIONS_PACKAGE_JSON_FILE,
            EXTENSIONS_OAUTH_TOKENS_FILE,
            EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL,
            EXTENSIONS_HEURISTIC_MACOS_PATHS: EXTENSIONS_HEURISTIC_MACOS_PATHS.to_vec(),
            EXTENSIONS_BROWSER_BRIDGE_HOST,
            EXTENSIONS_BROWSER_BRIDGE_PORT,
            EXTENSIONS_BROWSER_BRIDGE_STALE_SECONDS,
            EXTENSIONS_BROWSER_BRIDGE_MAX_BODY_BYTES,
            EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS,
            CLI_BRIDGE_HOST,
            CLI_BRIDGE_PORT,
            CLI_DMENU_REQUEST_EVENT,

            SCRIPT_COMMANDS_DIRECTORY,
            SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS,
            SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS,
            SCRIPT_COMMANDS_MAX_OUTPUT_BYTES,

            LAUNCHER_SHELL_DEFAULT_TIMEOUT_MS,
            LAUNCHER_SHELL_MAX_TIMEOUT_MS,
            LAUNCHER_SHELL_POLL_INTERVAL_MS,

            COMMAND_PINNED_KEY,

            TODO_DIRECTORY,
            TODO_DATABASE_FILE,

            NOTES_DIRECTORY,
            NOTES_DATABASE_FILE,

            SNIPPETS_DIRECTORY,
            SNIPPETS_DATABASE_FILE,
            SNIPPETS_DEFAULT_COOLDOWN_MS,
            SNIPPETS_DEFAULT_MAX_BUFFER_LEN,
            SNIPPETS_MIN_MAX_BUFFER_LEN,
            SNIPPETS_MAX_MAX_BUFFER_LEN,

            WINDOW_SWITCHER_PROCESS_CACHE_REFRESH_MS,

            LINUX_DESKTOP_GNOME_DBUS_DEST,
            LINUX_DESKTOP_GNOME_DBUS_PATH,
            LINUX_DESKTOP_GNOME_DBUS_INTERFACE,
            LINUX_DESKTOP_GNOME_EXTENSION_ID,
            LINUX_DESKTOP_GNOME_EXTENSION_METADATA_JSON,
            LINUX_DESKTOP_GNOME_EXTENSION_JS,
            LINUX_DESKTOP_GNOME_EXTENSION_STYLESHEET_CSS,
            LINUX_DESKTOP_HYPR_WINDOW_ID_PREFIX,
            LINUX_DESKTOP_SWAY_WINDOW_ID_PREFIX,

            LAUNCHER_THEME_DIR_NAME,
            LAUNCHER_THEME_MANIFEST_FILE_NAME,
            LAUNCHER_THEME_STYLESHEET_FILE_NAME,
            LAUNCHER_THEME_SELECTED_KEY,
            LAUNCHER_THEME_MAX_CSS_BYTES,

            COMMAND_ITEMS_CONFIG,
        })
    }
}
