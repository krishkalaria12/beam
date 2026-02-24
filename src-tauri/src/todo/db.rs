use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use tokio::sync::OnceCell;

use crate::config::config;

use super::error::{Error, Result};

pub type TodoDbPool = Arc<SqlitePool>;

static TODO_POOL: OnceCell<TodoDbPool> = OnceCell::const_new();

pub fn init(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = get_todo_pool(&app_handle).await {
            log::error!("todo sqlite initialization failed: {error}");
        }
    });
}

pub async fn init_todo_db(app: &AppHandle) -> Result<()> {
    let _ = get_todo_pool(app).await?;
    Ok(())
}

pub async fn get_todo_pool(app: &AppHandle) -> Result<TodoDbPool> {
    let app_handle = app.clone();

    let pool = TODO_POOL
        .get_or_try_init(|| async move {
            let database_path = get_todo_database_path(&app_handle)?;
            if let Some(parent_dir) = database_path.parent() {
                fs::create_dir_all(parent_dir)
                    .map_err(|error| Error::CreateDirectory(error.to_string()))?;
            }

            let connect_options = SqliteConnectOptions::new()
                .filename(&database_path)
                .create_if_missing(true)
                .foreign_keys(true)
                .journal_mode(SqliteJournalMode::Wal)
                .synchronous(SqliteSynchronous::Normal);

            let pool = SqlitePoolOptions::new()
                .max_connections(5)
                .connect_with(connect_options)
                .await
                .map_err(|error| Error::DatabaseConnection(error.to_string()))?;

            ensure_todo_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_todo_database_path(app: &AppHandle) -> Result<PathBuf> {
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| Error::AppDataDirUnavailable)?;

    Ok(app_local_data_dir
        .join(config().TODO_DIRECTORY)
        .join(config().TODO_DATABASE_FILE))
}

async fn ensure_todo_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL CHECK (length(trim(title)) > 0),
            completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| Error::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sub_todos (
            id TEXT PRIMARY KEY,
            todo_id TEXT NOT NULL,
            title TEXT NOT NULL CHECK (length(trim(title)) > 0),
            completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| Error::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_todos_order_created
        ON todos(order_index, created_at)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| Error::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_sub_todos_todo_order_created
        ON sub_todos(todo_id, order_index, created_at)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| Error::SchemaInitialization(error.to_string()))?;

    Ok(())
}
