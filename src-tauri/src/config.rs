pub(crate) const CONFIG: AppConfig = AppConfig {
    service_name: "beam",
    store_file_name: "settings.json",
};

pub(crate) struct AppConfig {
    pub service_name: &'static str,
    pub store_file_name: &'static str,
}
