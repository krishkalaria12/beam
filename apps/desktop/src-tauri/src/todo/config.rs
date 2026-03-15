pub(crate) const CONFIG: TodoConfig = TodoConfig {
    directory: "todo",
    database_file_name: "todo.sqlite3",
};

pub(crate) struct TodoConfig {
    pub directory: &'static str,
    pub database_file_name: &'static str,
}
