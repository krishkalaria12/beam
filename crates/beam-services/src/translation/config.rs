pub(crate) const CONFIG: TranslationConfig = TranslationConfig {
    api_base_url: "https://translate.googleapis.com",
    languages_endpoint: "/translate_a/l",
    translate_endpoint: "/translate_a/single",
    http_timeout_secs: 12,
    auto_source_language: "auto",
    default_format: "text",
    max_language_code_length: 24,
};

pub(crate) struct TranslationConfig {
    pub api_base_url: &'static str,
    pub languages_endpoint: &'static str,
    pub translate_endpoint: &'static str,
    pub http_timeout_secs: u64,
    pub auto_source_language: &'static str,
    pub default_format: &'static str,
    pub max_language_code_length: usize,
}
