use std::fs;
use std::path::{Path, PathBuf};

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

pub fn get_app_database_path<E, F>(
    app: &AppHandle,
    data_directory: &str,
    database_file: &str,
    app_data_dir_unavailable_error: F,
) -> Result<PathBuf, E>
where
    F: FnOnce() -> E,
{
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| app_data_dir_unavailable_error())?;

    Ok(app_local_data_dir.join(data_directory).join(database_file))
}

pub async fn create_sqlite_pool<E, FCreateDir, FConnect>(
    database_path: &Path,
    create_directory_error: FCreateDir,
    database_connection_error: FConnect,
) -> Result<SqlitePool, E>
where
    FCreateDir: Fn(std::io::Error) -> E,
    FConnect: Fn(sqlx::Error) -> E,
{
    if let Some(parent_dir) = database_path.parent() {
        fs::create_dir_all(parent_dir).map_err(create_directory_error)?;
    }

    let connect_options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await
        .map_err(database_connection_error)
}
