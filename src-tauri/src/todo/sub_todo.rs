use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::{command, AppHandle};

use crate::todo::helpers::{normalize_required_text, now_ts};

use super::db::{get_todo_pool, TodoDbPool};
use super::error::{Error, Result};
use super::todo::get_todo_internal;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct SubTodo {
    pub id: String,
    pub todo_id: String,
    pub title: String,
    pub completed: bool,
    pub order_index: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubTodoPayload {
    pub todo_id: String,
    pub title: String,
    pub order_index: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubTodoPayload {
    pub id: String,
    pub title: Option<String>,
    pub completed: Option<bool>,
    pub order_index: Option<i64>,
}

#[command]
pub async fn create_sub_todo(app: AppHandle, payload: CreateSubTodoPayload) -> Result<SubTodo> {
    let todo_id = normalize_required_text(&payload.todo_id, "todo id")?;
    let title = normalize_required_text(&payload.title, "sub todo title")?;
    let sub_todo_id = nanoid!();
    let now = now_ts();
    let order_index = payload.order_index.unwrap_or(0);

    let pool: TodoDbPool = get_todo_pool(&app).await?;

    // Ensure parent todo exists before insert.
    let _ = get_todo_internal(pool.as_ref(), &todo_id).await?;

    sqlx::query(
        "INSERT INTO sub_todos (id, todo_id, title, completed, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&sub_todo_id)
    .bind(&todo_id)
    .bind(&title)
    .bind(false)
    .bind(order_index)
    .bind(now)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|error| Error::Database(error.to_string()))?;

    get_sub_todo_internal(pool.as_ref(), &sub_todo_id).await
}

#[command]
pub async fn update_sub_todo(app: AppHandle, payload: UpdateSubTodoPayload) -> Result<()> {
    let sub_todo_id = normalize_required_text(&payload.id, "sub todo id")?;

    let next_title = match payload.title {
        Some(ref value) => Some(normalize_required_text(value, "sub todo title")?),
        None => None,
    };

    let pool: TodoDbPool = get_todo_pool(&app).await?;
    let current = get_sub_todo_internal(pool.as_ref(), &sub_todo_id).await?;

    let title = next_title.unwrap_or(current.title);
    let completed = payload.completed.unwrap_or(current.completed);
    let order_index = payload.order_index.unwrap_or(current.order_index);
    let updated_at = now_ts();

    let result = sqlx::query(
        "UPDATE sub_todos SET title = ?, completed = ?, order_index = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&title)
    .bind(completed)
    .bind(order_index)
    .bind(updated_at)
    .bind(&sub_todo_id)
    .execute(pool.as_ref())
    .await
    .map_err(|error| Error::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(Error::NotFound(format!(
            "sub todo '{}' not found",
            sub_todo_id
        )));
    }

    Ok(())
}

#[command]
pub async fn delete_sub_todo(app: AppHandle, sub_todo_id: String) -> Result<()> {
    let normalized_sub_todo_id = normalize_required_text(&sub_todo_id, "sub todo id")?;
    let pool: TodoDbPool = get_todo_pool(&app).await?;

    let result = sqlx::query("DELETE FROM sub_todos WHERE id = ?")
        .bind(&normalized_sub_todo_id)
        .execute(pool.as_ref())
        .await
        .map_err(|error| Error::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(Error::NotFound(format!(
            "sub todo '{}' not found",
            normalized_sub_todo_id
        )));
    }

    Ok(())
}

pub(crate) async fn get_sub_todo_internal(
    pool: &sqlx::SqlitePool,
    sub_todo_id: &str,
) -> Result<SubTodo> {
    sqlx::query_as::<_, SubTodo>(
        "SELECT id, todo_id, title, completed, order_index, created_at, updated_at FROM sub_todos WHERE id = ?",
    )
    .bind(sub_todo_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| Error::Database(error.to_string()))?
    .ok_or_else(|| Error::NotFound(format!("sub todo '{sub_todo_id}' not found")))
}
