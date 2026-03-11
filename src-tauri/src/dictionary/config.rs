pub(crate) const CONFIG: DictionaryConfig = DictionaryConfig {
    api_url: "https://freedictionaryapi.com/api/v1/entries",
};

pub(crate) struct DictionaryConfig {
    pub api_url: &'static str,
}
