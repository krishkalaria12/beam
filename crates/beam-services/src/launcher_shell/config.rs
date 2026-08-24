pub(crate) const CONFIG: LauncherShellConfig = LauncherShellConfig {
    default_timeout_ms: 15_000,
    max_timeout_ms: 120_000,
    poll_interval_ms: 25,
};

pub(crate) struct LauncherShellConfig {
    pub default_timeout_ms: u64,
    pub max_timeout_ms: u64,
    pub poll_interval_ms: u64,
}
