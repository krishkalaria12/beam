// PORT: apps/desktop/src-tauri/src/config.rs
// Consumed by settings and keyring modules landing in later batches.
#[allow(dead_code)]
pub(crate) const CONFIG: AppConfig = AppConfig {
    service_name: "beam",
    store_file_name: "settings.json",
};

#[allow(dead_code)]
pub(crate) struct AppConfig {
    pub service_name: &'static str,
    pub store_file_name: &'static str,
}
