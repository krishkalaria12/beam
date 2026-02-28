use std::path::PathBuf;
use std::sync::Arc;

use sqlx::SqlitePool;
use tauri::AppHandle;
use tokio::sync::OnceCell;

use crate::config::config;
use crate::utils::sqlite::{create_sqlite_pool, get_app_database_path};

use super::error::{Result, SnippetError};

pub type SnippetDbPool = Arc<SqlitePool>;

static SNIPPET_POOL: OnceCell<SnippetDbPool> = OnceCell::const_new();

pub fn init(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = get_snippets_pool(&app_handle).await {
            log::error!("snippets sqlite initialization failed: {error}");
        }
    });
}

pub async fn init_snippets_db(app: &AppHandle) -> Result<()> {
    let _ = get_snippets_pool(app).await?;
    Ok(())
}

pub async fn get_snippets_pool(app: &AppHandle) -> Result<SnippetDbPool> {
    let app_handle = app.clone();

    let pool = SNIPPET_POOL
        .get_or_try_init(|| async move {
            let database_path = get_snippets_database_path(&app_handle)?;
            let pool = create_sqlite_pool(
                &database_path,
                |error| SnippetError::CreateDirectory(error.to_string()),
                |error| SnippetError::DatabaseConnection(error.to_string()),
            )
            .await?;

            ensure_snippets_schema(&pool).await?;

            Ok(Arc::new(pool))
        })
        .await?;

    Ok(Arc::clone(pool))
}

pub fn get_snippets_database_path(app: &AppHandle) -> Result<PathBuf> {
    get_app_database_path(
        app,
        config().SNIPPETS_DIRECTORY,
        config().SNIPPETS_DATABASE_FILE,
        || SnippetError::AppDataDirUnavailable,
    )
}

async fn ensure_snippets_schema(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS snippet_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
          trigger_mode TEXT NOT NULL DEFAULT 'delimiter' CHECK (trigger_mode IN ('delimiter', 'instant')),
          cooldown_ms INTEGER NOT NULL DEFAULT 120 CHECK (cooldown_ms >= 0),
          max_buffer_len INTEGER NOT NULL DEFAULT 96 CHECK (max_buffer_len BETWEEN 8 AND 512),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO snippet_settings (id) VALUES (1)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS snippets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          trigger TEXT NOT NULL,
          trigger_norm TEXT NOT NULL,
          template TEXT NOT NULL CHECK (length(template) > 0),
          content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'code')),
          word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
          copied_count INTEGER NOT NULL DEFAULT 0 CHECK (copied_count >= 0),
          enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
          case_sensitive INTEGER NOT NULL DEFAULT 0 CHECK (case_sensitive IN (0, 1)),
          word_boundary INTEGER NOT NULL DEFAULT 1 CHECK (word_boundary IN (0, 1)),
          instant_expand INTEGER NOT NULL DEFAULT 0 CHECK (instant_expand IN (0, 1)),
          use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
          last_used_at TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          CHECK (length(trim(trigger)) > 0),
          CHECK (length(trigger) <= 128),
          CHECK (length(trigger_norm) <= 128)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_snippets_trigger_norm
        ON snippets(trigger_norm)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_snippets_enabled
        ON snippets(enabled)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_snippets_updated_at
        ON snippets(updated_at DESC)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS snippet_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          name_norm TEXT NOT NULL CHECK (length(trim(name_norm)) > 0),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          UNIQUE(name_norm)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS snippet_tag_map (
          snippet_id TEXT NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          PRIMARY KEY (snippet_id, tag_id),
          FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES snippet_tags(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_snippet_tags_name_norm
        ON snippet_tags(name_norm)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_snippet_tag_map_snippet
        ON snippet_tag_map(snippet_id)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_snippet_tag_map_tag
        ON snippet_tag_map(tag_id)
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_snippets_updated_at
        AFTER UPDATE ON snippets
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at
        BEGIN
          UPDATE snippets
          SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = OLD.id;
        END
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    sqlx::query(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_snippet_settings_updated_at
        AFTER UPDATE ON snippet_settings
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at
        BEGIN
          UPDATE snippet_settings
          SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = OLD.id;
        END
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| SnippetError::SchemaInitialization(error.to_string()))?;

    Ok(())
}
