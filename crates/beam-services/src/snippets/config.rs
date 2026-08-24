// PORT: apps/desktop/src-tauri/src/snippets/config.rs
// Consumers (db, repository, runtime) land with lane A3.
#[allow(dead_code)]
pub(crate) const CONFIG: SnippetsConfig = SnippetsConfig {
    directory: "snippets",
    database_file_name: "snippets.sqlite3",
    default_cooldown_ms: 120,
    default_max_buffer_len: 96,
    min_max_buffer_len: 8,
    max_max_buffer_len: 512,
};

#[allow(dead_code)]
pub(crate) struct SnippetsConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
    pub default_cooldown_ms: u64,
    pub default_max_buffer_len: usize,
    pub min_max_buffer_len: usize,
    pub max_max_buffer_len: usize,
}
