use std::path::PathBuf;
use std::sync::Arc;

use beam_core::BeamContext;
use sqlx::SqlitePool;
use tokio::sync::OnceCell;

// PORT: apps/desktop/src-tauri/src/calculator/db.rs

use crate::calculator::config::CONFIG as CALCULATOR_CONFIG;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{CalculatorError, Result};

pub type CalculatorDbPool = Arc<SqlitePool>;

static CALCULATOR_POOL: OnceCell<CalculatorDbPool> = OnceCell::const_new();

pub fn init(cx: &BeamContext) {
    let context = cx.clone();
    tokio::spawn(async move {
        if let Err(error) = get_calculator_pool(&context).await {
            log::error!("calculator sqlite initialization failed: {error}");
        }
    });
}

pub async fn get_calculator_pool(cx: &BeamContext) -> Result<CalculatorDbPool> {
    let context = cx.clone();

    let pool = CALCULATOR_POOL
        .get_or_try_init(|| async move {
            let database_path = get_calculator_database_path(&context)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| CalculatorError::CreateDirectory(error.to_string()),
                |error| CalculatorError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_calculator_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_calculator_database_path(cx: &BeamContext) -> Result<PathBuf> {
    Ok(get_app_database_path(
        cx.paths(),
        CALCULATOR_CONFIG.directory,
        CALCULATOR_CONFIG.database_file_name,
    ))
}

async fn ensure_calculator_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS calculator_history (
            timestamp INTEGER PRIMARY KEY,
            query TEXT NOT NULL,
            result TEXT NOT NULL,
            session_id TEXT,
            pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| CalculatorError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_calculator_history_timestamp
        ON calculator_history(timestamp DESC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| CalculatorError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
