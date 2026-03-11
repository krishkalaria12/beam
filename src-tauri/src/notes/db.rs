use std::path::PathBuf;
use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::AppHandle;
use tokio::sync::OnceCell;

use crate::notes::config::CONFIG as NOTES_CONFIG;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{NotesError, Result};

pub type NotesDbPool = Arc<SqlitePool>;

static NOTES_POOL: OnceCell<NotesDbPool> = OnceCell::const_new();

pub fn init(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = get_notes_pool(&app_handle).await {
            log::error!("notes sqlite initialization failed: {error}");
        }
    });
}

pub async fn get_notes_pool(app: &AppHandle) -> Result<NotesDbPool> {
    let app_handle = app.clone();

    let pool = NOTES_POOL
        .get_or_try_init(|| async move {
            let database_path = get_notes_database_path(&app_handle)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| NotesError::CreateDirectory(error.to_string()),
                |error| NotesError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_notes_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_notes_database_path(app: &AppHandle) -> Result<PathBuf> {
    get_app_database_path(
        app,
        NOTES_CONFIG.directory,
        NOTES_CONFIG.database_file_name,
        || NotesError::AppDataDirUnavailable,
    )
}

async fn ensure_notes_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL CHECK (length(trim(title)) > 0),
            content TEXT NOT NULL DEFAULT '',
            pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| NotesError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated
        ON notes(pinned DESC, updated_at DESC, created_at DESC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| NotesError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
