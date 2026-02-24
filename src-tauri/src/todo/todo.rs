use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::{command, AppHandle};

use crate::todo::helpers::{normalize_required_text, now_ts};

use super::db::{get_todo_pool, TodoDbPool};
use super::error::{Error, Result};

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub order_index: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTodoPayload {
    pub title: String,
    pub order_index: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTodoPayload {
    pub id: String,
    pub title: Option<String>,
    pub completed: Option<bool>,
    pub order_index: Option<i64>,
}

#[command]
pub async fn create_todo(app: AppHandle, payload: CreateTodoPayload) -> Result<Todo> {
    let title = normalize_required_text(&payload.title, "todo title")?;
    let todo_id = nanoid!();
    let now = now_ts();
    let order_index = payload.order_index.unwrap_or(0);

    let pool: TodoDbPool = get_todo_pool(&app).await?;

    sqlx::query(
        "INSERT INTO todos (id, title, completed, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&todo_id)
    .bind(&title)
    .bind(false)
    .bind(order_index)
    .bind(now)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|error| Error::Database(error.to_string()))?;

    get_todo_internal(pool.as_ref(), &todo_id).await
}

#[command]
pub async fn update_todo(app: AppHandle, payload: UpdateTodoPayload) -> Result<()> {
    let todo_id = normalize_required_text(&payload.id, "todo id")?;

    let next_title = match payload.title {
        Some(ref value) => Some(normalize_required_text(value, "todo title")?),
        None => None,
    };

    let pool: TodoDbPool = get_todo_pool(&app).await?;

    let current = get_todo_internal(pool.as_ref(), &todo_id).await?;

    let title = next_title.unwrap_or(current.title);
    let completed = payload.completed.unwrap_or(current.completed);
    let order_index = payload.order_index.unwrap_or(current.order_index);
    let updated_at = now_ts();

    let result = sqlx::query(
        "UPDATE todos SET title = ?, completed = ?, order_index = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&title)
    .bind(completed)
    .bind(order_index)
    .bind(updated_at)
    .bind(&todo_id)
    .execute(pool.as_ref())
    .await
    .map_err(|error| Error::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(Error::NotFound(format!("todo '{todo_id}' not found")));
    }

    Ok(())
}

#[command]
pub async fn delete_todo(app: AppHandle, todo_id: String) -> Result<()> {
    let normalized_todo_id = normalize_required_text(&todo_id, "todo id")?;
    let pool: TodoDbPool = get_todo_pool(&app).await?;

    let result = sqlx::query("DELETE FROM todos WHERE id = ?")
        .bind(&normalized_todo_id)
        .execute(pool.as_ref())
        .await
        .map_err(|error| Error::Database(error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(Error::NotFound(format!(
            "todo '{}' not found",
            normalized_todo_id
        )));
    }

    Ok(())
}

pub(crate) async fn get_todo_internal(pool: &sqlx::SqlitePool, todo_id: &str) -> Result<Todo> {
    sqlx::query_as::<_, Todo>(
        "SELECT id, title, completed, order_index, created_at, updated_at FROM todos WHERE id = ?",
    )
    .bind(todo_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| Error::Database(error.to_string()))?
    .ok_or_else(|| Error::NotFound(format!("todo '{todo_id}' not found")))
}
