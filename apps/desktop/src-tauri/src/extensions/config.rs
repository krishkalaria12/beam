pub(crate) const CONFIG: ExtensionsConfig = ExtensionsConfig {
    plugins_directory: "plugins",
    package_json_file_name: "package.json",
    oauth_tokens_file_name: "oauth_tokens.json",
    heuristic_applescript_symbol: "runAppleScript",
    heuristic_macos_paths: &["/Applications/", "/Library/", "/Users/"],
    browser_bridge: BrowserBridgeConfig {
        host: "127.0.0.1",
        port: 38957,
        stale_seconds: 45,
        max_body_bytes: 2 * 1024 * 1024,
        max_content_chars: 200_000,
    },
    store_catalog: StoreCatalogConfig {
        directory_name: "infra/store",
        file_name: "catalog.json",
        path_env_name: "BEAM_EXTENSION_STORE_CATALOG_PATH",
        url_env_name: "BEAM_EXTENSION_STORE_CATALOG_URL",
        default_catalog_json: include_str!("../../../../../infra/store/catalog.json"),
    },
};

pub(crate) struct ExtensionsConfig {
    pub plugins_directory: &'static str,
    pub package_json_file_name: &'static str,
    pub oauth_tokens_file_name: &'static str,
    pub heuristic_applescript_symbol: &'static str,
    pub heuristic_macos_paths: &'static [&'static str],
    pub browser_bridge: BrowserBridgeConfig,
    pub store_catalog: StoreCatalogConfig,
}

pub(crate) struct BrowserBridgeConfig {
    pub host: &'static str,
    pub port: u16,
    pub stale_seconds: u64,
    pub max_body_bytes: usize,
    pub max_content_chars: usize,
}

pub(crate) struct StoreCatalogConfig {
    pub directory_name: &'static str,
    pub file_name: &'static str,
    pub path_env_name: &'static str,
    pub url_env_name: &'static str,
    pub default_catalog_json: &'static str,
}
