pub(crate) const CONFIG: IntegrationsConfig = IntegrationsConfig {
    http_timeout_secs: 15,
    pkce_verifier_random_bytes: 48,
    state_random_bytes: 24,
    pkce_challenge_method: "S256",
};

pub(crate) struct IntegrationsConfig {
    pub http_timeout_secs: u64,
    pub pkce_verifier_random_bytes: usize,
    pub state_random_bytes: usize,
    pub pkce_challenge_method: &'static str,
}
