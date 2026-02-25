use chrono::Utc;
use std::collections::HashMap;

use super::error::{Result, TodoError};
use super::sub_todo::SubTodo;
use super::todo::Todo;
use super::TodoWithSubTodos;

pub fn normalize_required_text(value: &str, field: &str) -> Result<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(TodoError::InvalidArguments(format!(
            "{field} cannot be empty"
        )));
    }

    Ok(normalized.to_string())
}

pub fn now_ts() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn to_todo_with_sub_todos(todo: Todo, sub_todos: Vec<SubTodo>) -> TodoWithSubTodos {
    TodoWithSubTodos { todo, sub_todos }
}

pub fn merge_todo_list_with_sub_todos(
    todos: Vec<Todo>,
    sub_todos: Vec<SubTodo>,
) -> Vec<TodoWithSubTodos> {
    let mut sub_todos_by_todo_id: HashMap<String, Vec<SubTodo>> = HashMap::new();
    for sub_todo in sub_todos {
        sub_todos_by_todo_id
            .entry(sub_todo.todo_id.clone())
            .or_default()
            .push(sub_todo);
    }

    todos
        .into_iter()
        .map(|todo| {
            let todo_sub_todos = sub_todos_by_todo_id.remove(&todo.id).unwrap_or_default();
            to_todo_with_sub_todos(todo, todo_sub_todos)
        })
        .collect()
}
