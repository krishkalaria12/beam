pub(crate) const CONFIG: PinnedConfig = PinnedConfig {
    command_ids_key: "command_pinned_ids",
};

pub(crate) struct PinnedConfig {
    pub command_ids_key: &'static str,
}
