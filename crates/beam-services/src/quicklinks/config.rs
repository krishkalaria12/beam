// PORT: apps/desktop/src-tauri/src/quicklinks/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: QuicklinksConfig = QuicklinksConfig {
    store_file_name: "quicklinks.json",
    value_key: "quick_links",
};

pub(crate) struct QuicklinksConfig {
    pub store_file_name: &'static str,
    pub value_key: &'static str,
}
