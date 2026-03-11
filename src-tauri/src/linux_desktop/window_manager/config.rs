pub(crate) const CONFIG: WindowManagerConfig = WindowManagerConfig {
    hypr_window_id_prefix: "hypr:",
    sway_window_id_prefix: "sway:",
};

pub(crate) struct WindowManagerConfig {
    pub hypr_window_id_prefix: &'static str,
    pub sway_window_id_prefix: &'static str,
}
