pub(crate) mod config;
pub mod db;
pub mod error;
pub mod helpers;
pub mod sub_todo;
pub mod todo;

use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle};

use self::db::{get_todo_pool, TodoDbPool};
use self::error::{Result, TodoError};
use self::helpers::{
    merge_todo_list_with_sub_todos, normalize_required_text, to_todo_with_sub_todos,
};
use self::sub_todo::SubTodo;
use self::todo::Todo;

pub use sub_todo::{
    create_sub_todo, delete_sub_todo, update_sub_todo, CreateSubTodoPayload, UpdateSubTodoPayload,
};
pub use todo::{create_todo, delete_todo, update_todo, CreateTodoPayload, UpdateTodoPayload};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodoWithSubTodos {
    #[serde(flatten)]
    pub todo: Todo,
    pub sub_todos: Vec<SubTodo>,
}

#[command]
pub async fn get_todo(app: AppHandle, todo_id: String) -> Result<TodoWithSubTodos> {
    let normalized_todo_id = normalize_required_text(&todo_id, "todo id")?;
    let pool: TodoDbPool = get_todo_pool(&app).await?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| TodoError::Database(error.to_string()))?;

    let todo = sqlx::query_as::<_, Todo>(
        "SELECT id, title, completed, order_index, created_at, updated_at FROM todos WHERE id = ?",
    )
    .bind(&normalized_todo_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| TodoError::Database(error.to_string()))?
    .ok_or_else(|| TodoError::NotFound(format!("todo '{}' not found", normalized_todo_id)))?;

    let sub_todos = sqlx::query_as::<_, SubTodo>(
        "SELECT id, todo_id, title, completed, order_index, created_at, updated_at FROM sub_todos WHERE todo_id = ? ORDER BY order_index ASC, created_at ASC",
    )
    .bind(&normalized_todo_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|error| TodoError::Database(error.to_string()))?;

    tx.commit()
        .await
        .map_err(|error| TodoError::Database(error.to_string()))?;

    Ok(to_todo_with_sub_todos(todo, sub_todos))
}

#[command]
pub async fn get_todos(app: AppHandle) -> Result<Vec<TodoWithSubTodos>> {
    let pool: TodoDbPool = get_todo_pool(&app).await?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| TodoError::Database(error.to_string()))?;

    let todos = sqlx::query_as::<_, Todo>(
        "SELECT id, title, completed, order_index, created_at, updated_at FROM todos ORDER BY order_index ASC, created_at ASC",
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|error| TodoError::Database(error.to_string()))?;

    let sub_todos = sqlx::query_as::<_, SubTodo>(
        "SELECT id, todo_id, title, completed, order_index, created_at, updated_at FROM sub_todos ORDER BY order_index ASC, created_at ASC",
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|error| TodoError::Database(error.to_string()))?;

    tx.commit()
        .await
        .map_err(|error| TodoError::Database(error.to_string()))?;

    Ok(merge_todo_list_with_sub_todos(todos, sub_todos))
}
