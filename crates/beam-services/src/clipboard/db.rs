// PORT: apps/desktop/src-tauri/src/clipboard/db.rs
use std::path::PathBuf;
use std::sync::Arc;

use beam_core::BeamContext;
use sqlx::SqlitePool;
use tokio::sync::OnceCell;

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{ClipboardError, Result};

pub type ClipboardDbPool = Arc<SqlitePool>;

static CLIPBOARD_POOL: OnceCell<ClipboardDbPool> = OnceCell::const_new();

pub fn init(cx: &BeamContext) {
    let context = cx.clone();
    tokio::spawn(async move {
        if let Err(error) = get_clipboard_pool(&context).await {
            log::error!("clipboard sqlite initialization failed: {error}");
        }
    });
}

pub async fn get_clipboard_pool(cx: &BeamContext) -> Result<ClipboardDbPool> {
    let context = cx.clone();

    let pool = CLIPBOARD_POOL
        .get_or_try_init(|| async move {
            let database_path = get_clipboard_database_path(&context)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| ClipboardError::CreateDirectory(error.to_string()),
                |error| ClipboardError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_clipboard_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_clipboard_database_path(cx: &BeamContext) -> Result<PathBuf> {
    Ok(get_app_database_path(
        cx.paths(),
        CLIPBOARD_CONFIG.directory,
        CLIPBOARD_CONFIG.database_file_name,
    ))
}

async fn ensure_clipboard_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS clipboard_history (
            copied_at TEXT PRIMARY KEY,
            encrypted_value TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| ClipboardError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_copied_at
        ON clipboard_history(copied_at DESC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| ClipboardError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
