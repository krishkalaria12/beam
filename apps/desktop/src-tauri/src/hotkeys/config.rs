pub(crate) const CONFIG: HotkeysConfig = HotkeysConfig {
    global_shortcut_key: "hotkey_global_shortcut",
    command_hotkeys_key: "hotkey_command_hotkeys",
    default_global_shortcut: "SUPER+Space",
    command_event: "hotkey-command",
    settings_updated_event: "hotkey-settings-updated",
    backend_status_event: "hotkey-backend-status",
    portal_launcher_shortcut_id: "beam.launcher.toggle",
    portal_command_shortcut_prefix: "beam.command",
    wayland_fallback_message: "Global hotkeys are restricted by your compositor/portal setup.",
    wayland_disabled_message: "Global hotkeys are disabled because this is not a Wayland session.",
};

pub(crate) struct HotkeysConfig {
    pub global_shortcut_key: &'static str,
    pub command_hotkeys_key: &'static str,
    pub default_global_shortcut: &'static str,
    pub command_event: &'static str,
    pub settings_updated_event: &'static str,
    pub backend_status_event: &'static str,
    pub portal_launcher_shortcut_id: &'static str,
    pub portal_command_shortcut_prefix: &'static str,
    pub wayland_fallback_message: &'static str,
    pub wayland_disabled_message: &'static str,
}
