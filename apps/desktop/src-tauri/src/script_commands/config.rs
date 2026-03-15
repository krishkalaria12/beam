pub(crate) const CONFIG: ScriptCommandsConfig = ScriptCommandsConfig {
    directory: "script-commands",
    discovery_cache_ttl_ms: 12_000,
    default_timeout_ms: 60_000,
    max_output_bytes: 2 * 1024 * 1024,
};

pub(crate) struct ScriptCommandsConfig {
    pub directory: &'static str,
    pub discovery_cache_ttl_ms: u64,
    pub default_timeout_ms: u64,
    pub max_output_bytes: usize,
}
