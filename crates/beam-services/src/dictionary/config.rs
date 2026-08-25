// PORT: apps/desktop/src-tauri/src/dictionary/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: DictionaryConfig = DictionaryConfig {
    api_url: "https://freedictionaryapi.com/api/v1/entries",
};

pub(crate) struct DictionaryConfig {
    pub api_url: &'static str,
}
