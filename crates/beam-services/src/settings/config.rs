pub(crate) const CONFIG: SettingsConfig = SettingsConfig {
    ui_layout_mode_key: "ui_layout_mode",
    ui_style_key: "ui_style",
    base_color_key: "base_color",
    launcher_opacity_key: "launcher_opacity",
    icon_theme_key: "icon_theme",
    launcher_font_family_key: "launcher_font_family",
    launcher_font_size_key: "launcher_font_size",
    trigger_symbols_key: "trigger_symbols",
    default_base_color: "#101113",
    default_launcher_opacity: 0.96,
    default_launcher_font_family: "default",
    default_launcher_font_size: 13.0,
};

pub(crate) struct SettingsConfig {
    pub ui_layout_mode_key: &'static str,
    pub ui_style_key: &'static str,
    pub base_color_key: &'static str,
    pub launcher_opacity_key: &'static str,
    pub icon_theme_key: &'static str,
    pub launcher_font_family_key: &'static str,
    pub launcher_font_size_key: &'static str,
    pub trigger_symbols_key: &'static str,
    pub default_base_color: &'static str,
    pub default_launcher_opacity: f64,
    pub default_launcher_font_family: &'static str,
    pub default_launcher_font_size: f64,
}
