use std::collections::BTreeMap;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct HotkeySettings {
    pub global_shortcut: String,
    pub command_hotkeys: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyCapabilities {
    pub session_type: String,
    pub compositor: String,
    pub backend: String,
    pub global_launcher_supported: bool,
    pub global_command_hotkeys_supported: bool,
    pub launcher_only_supported: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyUpdateResult {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommandHotkeyUpdateResult {
    pub success: bool,
    pub error: Option<String>,
    pub conflict_command_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CompositorBindings {
    pub compositor: String,
    pub backend: String,
    pub command_prefix: String,
    pub launcher_binding_examples: Vec<String>,
    pub command_binding_examples: Vec<String>,
    pub notes: Vec<String>,
}
