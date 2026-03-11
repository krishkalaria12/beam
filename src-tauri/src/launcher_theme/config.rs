pub(crate) const CONFIG: LauncherThemeConfig = LauncherThemeConfig {
    directory_name: "themes",
    manifest_file_name: "theme.json",
    stylesheet_file_name: "theme.css",
    selected_theme_key: "launcher_theme_id",
    max_css_bytes: 512 * 1024,
};

pub(crate) struct LauncherThemeConfig {
    pub directory_name: &'static str,
    pub manifest_file_name: &'static str,
    pub stylesheet_file_name: &'static str,
    pub selected_theme_key: &'static str,
    pub max_css_bytes: usize,
}
