// PORT: apps/desktop/src-tauri/src/calculator/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: CalculatorConfig = CalculatorConfig {
    directory: "calculator",
    database_file_name: "calculator.sqlite3",
    max_history_entries: 50,
};

pub(crate) struct CalculatorConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
    pub max_history_entries: usize,
}
