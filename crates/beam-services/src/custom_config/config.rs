// PORT: apps/desktop/src-tauri/src/custom_config/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: CustomConfig = CustomConfig {
    hidden_command_ids_key: "hidden_command_ids",
};

pub(crate) struct CustomConfig {
    pub hidden_command_ids_key: &'static str,
}
