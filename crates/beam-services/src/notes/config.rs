// PORT: apps/desktop/src-tauri/src/notes/config.rs
// Copied verbatim; no Tauri APIs in this file.
pub(crate) const CONFIG: NotesConfig = NotesConfig {
    directory: "notes",
    database_file_name: "notes.sqlite3",
};

pub(crate) struct NotesConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
}
