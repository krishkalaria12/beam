// PORT: apps/desktop/src-tauri/src/notes/db.rs
use std::path::PathBuf;
use std::sync::Arc;

use beam_core::BeamContext;
use sqlx::SqlitePool;
use tokio::sync::OnceCell;

use crate::notes::config::CONFIG as NOTES_CONFIG;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{NotesError, Result};

pub type NotesDbPool = Arc<SqlitePool>;

static NOTES_POOL: OnceCell<NotesDbPool> = OnceCell::const_new();

pub fn init(cx: &BeamContext) {
    let context = cx.clone();
    tokio::spawn(async move {
        if let Err(error) = get_notes_pool(&context).await {
            log::error!("notes sqlite initialization failed: {error}");
        }
    });
}

pub async fn get_notes_pool(cx: &BeamContext) -> Result<NotesDbPool> {
    let context = cx.clone();

    let pool = NOTES_POOL
        .get_or_try_init(|| async move {
            let database_path = get_notes_database_path(&context)?;
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

pub fn get_notes_database_path(cx: &BeamContext) -> Result<PathBuf> {
    Ok(get_app_database_path(
        cx.paths(),
        NOTES_CONFIG.directory,
        NOTES_CONFIG.database_file_name,
    ))
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
