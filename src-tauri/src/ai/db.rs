use std::path::PathBuf;
use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::AppHandle;
use tokio::sync::OnceCell;

use crate::config::config;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{AiError, Result};

pub type AiDbPool = Arc<SqlitePool>;

static AI_POOL: OnceCell<AiDbPool> = OnceCell::const_new();

pub fn init(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = get_ai_pool(&app_handle).await {
            log::error!("ai sqlite initialization failed: {error}");
        }
    });
}

pub async fn get_ai_pool(app: &AppHandle) -> Result<AiDbPool> {
    let app_handle = app.clone();

    let pool = AI_POOL
        .get_or_try_init(|| async move {
            let database_path = get_ai_database_path(&app_handle)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| AiError::CreateDirectory(error.to_string()),
                |error| AiError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_ai_schema(&pool).await?;

            Ok::<AiDbPool, AiError>(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_ai_database_path(app: &AppHandle) -> Result<PathBuf> {
    get_app_database_path(
        app,
        config().AI_DIRECTORY,
        config().AI_DATABASE_FILE,
        || AiError::AppDataDirUnavailable,
    )
}

async fn ensure_ai_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_created
        ON ai_chat_messages(conversation_id, created_at ASC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_request_id
        ON ai_chat_messages(request_id)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_token_usage (
            request_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            cached_input_tokens INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_ai_token_usage_conversation_created
        ON ai_token_usage(conversation_id, created_at DESC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_conversation_context (
            conversation_id TEXT PRIMARY KEY,
            summary_text TEXT NOT NULL DEFAULT '',
            summarized_until_created_at INTEGER NOT NULL DEFAULT 0,
            total_tokens_at_summary INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| AiError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
