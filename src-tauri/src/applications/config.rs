pub(crate) const CONFIG: ApplicationsConfig = ApplicationsConfig {
    last_updated_timestamp_key: "last_updated_application_timestamp",
    timestamp_diff_days: 1,
    cache_key: "applications_cache",
    cache_updated_event: "applications-cache-updated",
    application_directories: &["~/.local/share/applications/", "/usr/share/applications/"],
    icon_directories: &[
        "~/.local/share/icons",
        "~/.icons",
        "/usr/share/icons",
        "/usr/local/share/icons",
        "/usr/share/pixmaps",
        "/var/lib/flatpak/exports/share/icons",
        "/var/lib/snapd/desktop/icons",
    ],
};

pub(crate) struct ApplicationsConfig {
    pub last_updated_timestamp_key: &'static str,
    pub timestamp_diff_days: usize,
    pub cache_key: &'static str,
    pub cache_updated_event: &'static str,
    pub application_directories: &'static [&'static str],
    pub icon_directories: &'static [&'static str],
}
