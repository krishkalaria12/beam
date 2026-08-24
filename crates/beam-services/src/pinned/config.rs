// PORT: apps/desktop/src-tauri/src/pinned/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: PinnedConfig = PinnedConfig {
    command_ids_key: "command_pinned_ids",
};

pub(crate) struct PinnedConfig {
    pub command_ids_key: &'static str,
}
