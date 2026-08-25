use std::fs;
use std::path::{Path, PathBuf};

use beam_core::BeamPaths;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;

// PORT: apps/desktop/src-tauri/src/utils/sqlite.rs
// AppHandle + Manager replaced by BeamPaths (the asserted data directories);
// the unavailable-error closure went away with the fallible path resolution.

pub fn get_app_database_path(
    paths: &BeamPaths,
    data_directory: &str,
    database_file: &str,
) -> PathBuf {
    paths
        .local_data_dir()
        .join(data_directory)
        .join(database_file)
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
