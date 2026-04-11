pub(crate) const CONFIG: ClipboardConfig = ClipboardConfig {
    directory: "clipboard",
    database_file_name: "clipboard.sqlite3",
    poll_interval_ms: 350,
    max_history_entries: 100,
    keyring_name: "secret-key",
    encryption_prefix: "beam:aesgcm:v1:",
    encryption_nonce_bytes: 12,
    encryption_password_length: 64,
    search_max_results: 75,
    search_max_entry_chars: 4096,
    search_value_weight: 5,
    search_content_type_weight: 2,
};

pub(crate) struct ClipboardConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
    pub poll_interval_ms: u64,
    pub max_history_entries: usize,
    pub keyring_name: &'static str,
    pub encryption_prefix: &'static str,
    pub encryption_nonce_bytes: usize,
    pub encryption_password_length: usize,
    pub search_max_results: usize,
    pub search_max_entry_chars: usize,
    pub search_value_weight: u32,
    pub search_content_type_weight: u32,
}
