pub(crate) const CONFIG: CalculatorConfig = CalculatorConfig {
    history_key: "calculator_history",
    pinned_timestamps_key: "calculator_pinned_timestamps",
    store_file_name: "calculator_history.json",
    max_history_entries: 50,
};

pub(crate) struct CalculatorConfig {
    pub history_key: &'static str,
    pub pinned_timestamps_key: &'static str,
    pub store_file_name: &'static str,
    pub max_history_entries: usize,
}
