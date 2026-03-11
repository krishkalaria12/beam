pub(crate) const CONFIG: QuicklinksConfig = QuicklinksConfig {
    store_file_name: "quicklinks.json",
    value_key: "quick_links",
};

pub(crate) struct QuicklinksConfig {
    pub store_file_name: &'static str,
    pub value_key: &'static str,
}
