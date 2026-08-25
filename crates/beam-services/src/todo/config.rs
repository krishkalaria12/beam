// PORT: apps/desktop/src-tauri/src/todo/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: TodoConfig = TodoConfig {
    directory: "todo",
    database_file_name: "todo.sqlite3",
};

pub(crate) struct TodoConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
}
