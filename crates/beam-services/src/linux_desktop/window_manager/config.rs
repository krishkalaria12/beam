// PORT: apps/desktop/src-tauri/src/linux_desktop/window_manager/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: WindowManagerConfig = WindowManagerConfig {
    hypr_window_id_prefix: "hypr:",
    sway_window_id_prefix: "sway:",
};

pub(crate) struct WindowManagerConfig {
    pub hypr_window_id_prefix: &'static str,
    pub sway_window_id_prefix: &'static str,
}
