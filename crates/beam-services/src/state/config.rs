// PORT: apps/desktop/src-tauri/src/state/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: StateConfig = StateConfig {
    process_cache_refresh_ms: 2_000,
};

pub(crate) struct StateConfig {
    pub process_cache_refresh_ms: u64,
}
