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

    // -- Snippets
    pub SNIPPETS_DIRECTORY: &'static str,
    pub SNIPPETS_DATABASE_FILE: &'static str,
    pub SNIPPETS_DEFAULT_COOLDOWN_MS: u64,
    pub SNIPPETS_DEFAULT_MAX_BUFFER_LEN: usize,
    pub SNIPPETS_MIN_MAX_BUFFER_LEN: usize,
    pub SNIPPETS_MAX_MAX_BUFFER_LEN: usize,

    // -- Window Switcher
    pub WINDOW_SWITCHER_PROCESS_CACHE_REFRESH_MS: u64,

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

            INTEGRATIONS_HTTP_TIMEOUT_SECS: 15,
            INTEGRATIONS_PKCE_VERIFIER_RANDOM_BYTES: 48,
            INTEGRATIONS_STATE_RANDOM_BYTES: 24,
            INTEGRATIONS_PKCE_CHALLENGE_METHOD: "S256",

            SPOTIFY_AUTHORIZE_URL: "https://accounts.spotify.com/authorize",
            SPOTIFY_TOKEN_URL: "https://accounts.spotify.com/api/token",
            SPOTIFY_ME_URL: "https://api.spotify.com/v1/me",
            SPOTIFY_PLAYER_URL: "https://api.spotify.com/v1/me/player",
            SPOTIFY_PLAYER_DEVICES_URL: "https://api.spotify.com/v1/me/player/devices",
            SPOTIFY_PLAYER_PLAY_URL: "https://api.spotify.com/v1/me/player/play",
            SPOTIFY_PLAYER_PAUSE_URL: "https://api.spotify.com/v1/me/player/pause",
            SPOTIFY_PLAYER_NEXT_URL: "https://api.spotify.com/v1/me/player/next",
            SPOTIFY_PLAYER_PREVIOUS_URL: "https://api.spotify.com/v1/me/player/previous",
            SPOTIFY_SEARCH_URL: "https://api.spotify.com/v1/search",
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

            GITHUB_AUTHORIZE_URL: "https://github.com/login/oauth/authorize",
            GITHUB_TOKEN_URL: "https://github.com/login/oauth/access_token",
            GITHUB_USER_URL: "https://api.github.com/user",
            GITHUB_ISSUES_URL: "https://api.github.com/issues",
            GITHUB_SEARCH_ISSUES_URL: "https://api.github.com/search/issues",
            GITHUB_API_VERSION: "2022-11-28",
            GITHUB_USER_AGENT: "beam-desktop",
            GITHUB_DEFAULT_SCOPES: vec!["read:user", "repo", "read:org", "notifications"],
            GITHUB_DEFAULT_ISSUES_FILTER: "assigned",
            GITHUB_DEFAULT_ISSUES_STATE: "open",
            GITHUB_DEFAULT_ISSUES_SORT: "updated",
            GITHUB_DEFAULT_ISSUES_DIRECTION: "desc",
            GITHUB_DEFAULT_ISSUES_PER_PAGE: 20,
            GITHUB_MAX_ISSUES_PER_PAGE: 100,

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
            AI_DIRECTORY: "ai",
            AI_ATTACHMENTS_DIRECTORY: "attachments",
            AI_DATABASE_FILE: "chat.sqlite3",
            AI_DEFAULT_CONVERSATION_ID: "default",
            AI_CHAT_HISTORY_DEFAULT_LIMIT: 200,
            AI_CHAT_HISTORY_MAX_LIMIT: 1000,
            AI_SETTINGS_FILE: "ai_settings.json",
            AI_KEYRING_SERVICE: "dev.byteatatime.beam.ai",
            AI_OPENROUTER_KEYRING_USERNAME: "openrouter_api_key",
            AI_OPENAI_KEYRING_USERNAME: "openai_api_key",
            AI_ANTHROPIC_KEYRING_USERNAME: "anthropic_api_key",
            AI_GEMINI_KEYRING_USERNAME: "gemini_api_key",
            AI_DEFAULT_OPENROUTER_MODEL: "moonshotai/kimi-k2.5",
            AI_DEFAULT_OPENAI_MODEL: "gpt-5.2-2025-12-11",
            AI_DEFAULT_ANTHROPIC_MODEL: "claude-sonnet-4-6",
            AI_DEFAULT_GEMINI_MODEL: "gemini-3-flash-preview",
            AI_DEFAULT_OPENAI_REASONING_EFFORT: "medium",
            AI_OPENAI_CONTEXT_WINDOW_TOKENS: 400_000,
            AI_OPENAI_MAX_OUTPUT_TOKENS: 128_000,
            AI_GEMINI_CONTEXT_WINDOW_TOKENS: 1_000_000,
            AI_GEMINI_MAX_OUTPUT_TOKENS: 64_000,
            AI_ANTHROPIC_CONTEXT_WINDOW_TOKENS: 200_000,
            AI_ANTHROPIC_MAX_OUTPUT_TOKENS: 64_000,
            AI_OPENROUTER_CONTEXT_WINDOW_TOKENS: 200_000,
            AI_OPENROUTER_MAX_OUTPUT_TOKENS: 64_000,
            AI_CONTEXT_ESTIMATED_CHARS_PER_TOKEN: 4,
            AI_CONTEXT_MESSAGE_OVERHEAD_TOKENS: 24,
            AI_CONTEXT_INPUT_HEADROOM_TOKENS: 4_096,
            AI_CONTEXT_MESSAGES_LIMIT: 400,
            AI_CONTEXT_KEEP_RECENT_MESSAGES: 24,
            AI_CONTEXT_MIN_MESSAGES_TO_COMPACT: 8,
            AI_CONTEXT_MAX_COMPACTION_PASSES: 2,
            AI_MAX_ATTACHMENTS: 8,
            AI_MAX_ATTACHMENT_BASE64_BYTES: 25 * 1024 * 1024,
            EXTENSIONS_PLUGINS_DIRECTORY: "plugins",
            EXTENSIONS_PACKAGE_JSON_FILE: "package.json",
            EXTENSIONS_OAUTH_TOKENS_FILE: "oauth_tokens.json",
            EXTENSIONS_HEURISTIC_APPLESCRIPT_SYMBOL: "runAppleScript",
            EXTENSIONS_HEURISTIC_MACOS_PATHS: vec!["/Applications/", "/Library/", "/Users/"],
            EXTENSIONS_BROWSER_BRIDGE_HOST: "127.0.0.1",
            EXTENSIONS_BROWSER_BRIDGE_PORT: 38957,
            EXTENSIONS_BROWSER_BRIDGE_STALE_SECONDS: 45,
            EXTENSIONS_BROWSER_BRIDGE_MAX_BODY_BYTES: 2 * 1024 * 1024,
            EXTENSIONS_BROWSER_BRIDGE_MAX_CONTENT_CHARS: 200_000,

            SCRIPT_COMMANDS_DIRECTORY: "script-commands",
            SCRIPT_COMMANDS_DISCOVERY_CACHE_TTL_MS: 12_000,
            SCRIPT_COMMANDS_DEFAULT_TIMEOUT_MS: 60_000,
            SCRIPT_COMMANDS_MAX_OUTPUT_BYTES: 2 * 1024 * 1024,

            COMMAND_PINNED_KEY: "command_pinned_ids",

            TODO_DIRECTORY: "todo",
            TODO_DATABASE_FILE: "todo.sqlite3",

            SNIPPETS_DIRECTORY: "snippets",
            SNIPPETS_DATABASE_FILE: "snippets.sqlite3",
            SNIPPETS_DEFAULT_COOLDOWN_MS: 120,
            SNIPPETS_DEFAULT_MAX_BUFFER_LEN: 96,
            SNIPPETS_MIN_MAX_BUFFER_LEN: 8,
            SNIPPETS_MAX_MAX_BUFFER_LEN: 512,

            WINDOW_SWITCHER_PROCESS_CACHE_REFRESH_MS: 2_000,

            LAUNCHER_THEME_DIR_NAME: "themes",
            LAUNCHER_THEME_MANIFEST_FILE_NAME: "theme.json",
            LAUNCHER_THEME_STYLESHEET_FILE_NAME: "theme.css",
            LAUNCHER_THEME_SELECTED_KEY: "launcher_theme_id",
            LAUNCHER_THEME_MAX_CSS_BYTES: 512 * 1024,

            COMMAND_ITEMS_CONFIG: "hidden_command_ids",
        })
    }
}
