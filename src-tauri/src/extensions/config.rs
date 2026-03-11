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
};

pub(crate) struct ExtensionsConfig {
    pub plugins_directory: &'static str,
    pub package_json_file_name: &'static str,
    pub oauth_tokens_file_name: &'static str,
    pub heuristic_applescript_symbol: &'static str,
    pub heuristic_macos_paths: &'static [&'static str],
    pub browser_bridge: BrowserBridgeConfig,
}

pub(crate) struct BrowserBridgeConfig {
    pub host: &'static str,
    pub port: u16,
    pub stale_seconds: u64,
    pub max_body_bytes: usize,
    pub max_content_chars: usize,
}
