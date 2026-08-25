// PORT: apps/desktop/src-tauri/src/todo/db.rs
use std::path::PathBuf;
use std::sync::Arc;

use beam_core::BeamContext;
use sqlx::SqlitePool;
use tokio::sync::OnceCell;

use crate::todo::config::CONFIG as TODO_CONFIG;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{Result, TodoError};

pub type TodoDbPool = Arc<SqlitePool>;

static TODO_POOL: OnceCell<TodoDbPool> = OnceCell::const_new();

pub fn init(cx: &BeamContext) {
    let context = cx.clone();
    tokio::spawn(async move {
        if let Err(error) = get_todo_pool(&context).await {
            log::error!("todo sqlite initialization failed: {error}");
        }
    });
}

pub async fn init_todo_db(cx: &BeamContext) -> Result<()> {
    let _ = get_todo_pool(cx).await?;
    Ok(())
}

pub async fn get_todo_pool(cx: &BeamContext) -> Result<TodoDbPool> {
    let context = cx.clone();

    let pool = TODO_POOL
        .get_or_try_init(|| async move {
            let database_path = get_todo_database_path(&context)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| TodoError::CreateDirectory(error.to_string()),
                |error| TodoError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_todo_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_todo_database_path(cx: &BeamContext) -> Result<PathBuf> {
    Ok(get_app_database_path(
        cx.paths(),
        TODO_CONFIG.directory,
        TODO_CONFIG.database_file_name,
    ))
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
    .map_err(|error| TodoError::SchemaInitialization(error.to_string()))?;

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
    .map_err(|error| TodoError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_todos_order_created
        ON todos(order_index, created_at)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| TodoError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_sub_todos_todo_order_created
        ON sub_todos(todo_id, order_index, created_at)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| TodoError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
