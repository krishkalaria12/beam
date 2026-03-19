pub(crate) const CONFIG: SettingsConfig = SettingsConfig {
    ui_layout_mode_key: "ui_layout_mode",
    launcher_opacity_key: "launcher_opacity",
    icon_theme_key: "icon_theme",
    default_launcher_opacity: 0.96,
};

pub(crate) struct SettingsConfig {
    pub ui_layout_mode_key: &'static str,
    pub launcher_opacity_key: &'static str,
    pub icon_theme_key: &'static str,
    pub default_launcher_opacity: f64,
}
