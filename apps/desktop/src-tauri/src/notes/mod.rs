pub(crate) mod config;
pub mod db;
pub mod error;

use chrono::Utc;
use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::{command, AppHandle};

use self::db::{get_notes_pool, NotesDbPool};
use self::error::{NotesError, Result};

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotePayload {
    pub title: String,
    pub content: Option<String>,
    pub pinned: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotePayload {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub pinned: Option<bool>,
}

fn normalize_required_title(value: &str, field: &str) -> Result<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(NotesError::InvalidArguments(format!(
            "{field} cannot be empty"
        )));
    }

    Ok(normalized.to_string())
}

fn now_ts() -> i64 {
    Utc::now().timestamp_millis()
}

#[command]
pub async fn get_notes(app: AppHandle) -> Result<Vec<Note>> {
    let pool: NotesDbPool = get_notes_pool(&app).await?;

    sqlx::query_as::<_, Note>(
        "SELECT id, title, content, pinned, created_at, updated_at FROM notes ORDER BY pinned DESC, updated_at DESC, created_at DESC",
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|error| NotesError::Database(error.to_string()))
}

#[command]
pub async fn create_note(app: AppHandle, payload: CreateNotePayload) -> Result<Note> {
    let title = normalize_required_title(&payload.title, "note title")?;
    let content = payload.content.unwrap_or_default();
    let pinned = payload.pinned.unwrap_or(false);
    let note_id = nanoid!();
    let now = now_ts();

    let pool: NotesDbPool = get_notes_pool(&app).await?;

    sqlx::query(
        "INSERT INTO notes (id, title, content, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&note_id)
    .bind(&title)
    .bind(&content)
    .bind(pinned)
    .bind(now)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|error| NotesError::Database(error.to_string()))?;

    get_note_internal(pool.as_ref(), &note_id).await
}

#[command]
pub async fn update_note(app: AppHandle, payload: UpdateNotePayload) -> Result<Note> {
    let note_id = normalize_required_title(&payload.id, "note id")?;
    let pool: NotesDbPool = get_notes_pool(&app).await?;

    let current = get_note_internal(pool.as_ref(), &note_id).await?;

    let title = match payload.title {
        Some(value) => normalize_required_title(&value, "note title")?,
        None => current.title,
    };
    let content = payload.content.unwrap_or(current.content);
    let pinned = payload.pinned.unwrap_or(current.pinned);
    let updated_at = now_ts();

    let result = sqlx::query(
        "UPDATE notes SET title = ?, content = ?, pinned = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&title)
    .bind(&content)
    .bind(pinned)
    .bind(updated_at)
    .bind(&note_id)
    .execute(pool.as_ref())
    .await
    .map_err(|error| NotesError::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(NotesError::NotFound(format!("note '{note_id}' not found")));
    }

    get_note_internal(pool.as_ref(), &note_id).await
}

#[command]
pub async fn delete_note(app: AppHandle, note_id: String) -> Result<()> {
    let normalized_note_id = normalize_required_title(&note_id, "note id")?;
    let pool: NotesDbPool = get_notes_pool(&app).await?;

    let result = sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(&normalized_note_id)
        .execute(pool.as_ref())
        .await
        .map_err(|error| NotesError::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(NotesError::NotFound(format!(
            "note '{}' not found",
            normalized_note_id
        )));
    }

    Ok(())
}

async fn get_note_internal(pool: &sqlx::SqlitePool, note_id: &str) -> Result<Note> {
    sqlx::query_as::<_, Note>(
        "SELECT id, title, content, pinned, created_at, updated_at FROM notes WHERE id = ?",
    )
    .bind(note_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| NotesError::Database(error.to_string()))?
    .ok_or_else(|| NotesError::NotFound(format!("note '{note_id}' not found")))
}
