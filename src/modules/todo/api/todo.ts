import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  subTodoSchema,
  todoWithSubTodosListSchema,
  todoWithSubTodosSchema,
  type CreateSubTodoInput,
  type CreateTodoInput,
  type SubTodo,
  type TodoWithSubTodos,
  type UpdateSubTodoInput,
  type UpdateTodoInput,
} from "@/modules/todo/types";

function assertDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("Todo commands require desktop runtime.");
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

export async function getTodos(): Promise<TodoWithSubTodos[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_todos");
  const parsed = todoWithSubTodosListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid todo list response from backend.");
  }

  return parsed.data;
}

export async function getTodo(todoId: string): Promise<TodoWithSubTodos> {
  assertDesktopRuntime();
  const id = normalizeRequiredText(todoId, "todo id");

  const response = await invoke<unknown>("get_todo", { todoId: id });
  const parsed = todoWithSubTodosSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid todo response from backend.");
  }

  return parsed.data;
}

export async function createTodo(input: CreateTodoInput): Promise<TodoWithSubTodos> {
  assertDesktopRuntime();

  const payload = {
    title: normalizeRequiredText(input.title, "todo title"),
    ...(typeof input.orderIndex === "number" ? { order_index: input.orderIndex } : {}),
  };

  const created = await invoke<unknown>("create_todo", { payload });
  const todoId =
    typeof created === "object" &&
    created !== null &&
    typeof (created as { id?: unknown }).id === "string"
      ? (created as { id: string }).id.trim()
      : "";

  if (!todoId) {
    throw new Error("Invalid created todo response from backend.");
  }

  return getTodo(todoId);
}

export async function updateTodo(input: UpdateTodoInput): Promise<void> {
  assertDesktopRuntime();

  const payload = {
    id: normalizeRequiredText(input.id, "todo id"),
    ...(typeof input.title === "string" ? { title: normalizeRequiredText(input.title, "todo title") } : {}),
    ...(typeof input.completed === "boolean" ? { completed: input.completed } : {}),
    ...(typeof input.orderIndex === "number" ? { order_index: input.orderIndex } : {}),
  };

  await invoke("update_todo", { payload });
}

export async function deleteTodo(todoId: string): Promise<void> {
  assertDesktopRuntime();
  const id = normalizeRequiredText(todoId, "todo id");
  await invoke("delete_todo", { todoId: id });
}

export async function createSubTodo(input: CreateSubTodoInput): Promise<SubTodo> {
  assertDesktopRuntime();

  const payload = {
    todo_id: normalizeRequiredText(input.todoId, "todo id"),
    title: normalizeRequiredText(input.title, "sub todo title"),
    ...(typeof input.orderIndex === "number" ? { order_index: input.orderIndex } : {}),
  };

  const created = await invoke<unknown>("create_sub_todo", { payload });
  const parsed = subTodoSchema.safeParse(created);
  if (!parsed.success) {
    throw new Error("Invalid created sub todo response from backend.");
  }

  return parsed.data;
}

export async function updateSubTodo(input: UpdateSubTodoInput): Promise<void> {
  assertDesktopRuntime();

  const payload = {
    id: normalizeRequiredText(input.id, "sub todo id"),
    ...(typeof input.title === "string"
      ? { title: normalizeRequiredText(input.title, "sub todo title") }
      : {}),
    ...(typeof input.completed === "boolean" ? { completed: input.completed } : {}),
    ...(typeof input.orderIndex === "number" ? { order_index: input.orderIndex } : {}),
  };

  await invoke("update_sub_todo", { payload });
}

export async function deleteSubTodo(subTodoId: string): Promise<void> {
  assertDesktopRuntime();
  const id = normalizeRequiredText(subTodoId, "sub todo id");
  await invoke("delete_sub_todo", { subTodoId: id });
}
