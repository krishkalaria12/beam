import type { SubTodo, TodoWithSubTodos } from "@/modules/todo/types";

interface ReorderUpdate {
  id: string;
  orderIndex: number;
}

export function countCompleted(items: readonly SubTodo[]): number {
  return items.reduce((total, item) => total + (item.completed ? 1 : 0), 0);
}

export function normalizeTitle(input: string): string {
  return input.trim();
}

export function hasSameOrder(current: readonly string[], next: readonly string[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((value, index) => value === next[index]);
}

export function orderTodos(
  todos: readonly TodoWithSubTodos[],
  order: readonly string[],
): TodoWithSubTodos[] {
  const byId = new Map(todos.map((todo) => [todo.id, todo]));
  const ordered = order
    .map((todoId) => byId.get(todoId))
    .filter((todo): todo is TodoWithSubTodos => Boolean(todo));

  if (ordered.length === todos.length) {
    return ordered;
  }

  const used = new Set(ordered.map((todo) => todo.id));
  return [...ordered, ...todos.filter((todo) => !used.has(todo.id))];
}

export function orderSubTodos(subTodos: readonly SubTodo[], order: readonly string[]): SubTodo[] {
  const byId = new Map(subTodos.map((subTodo) => [subTodo.id, subTodo]));
  const ordered = order
    .map((subTodoId) => byId.get(subTodoId))
    .filter((subTodo): subTodo is SubTodo => Boolean(subTodo));

  if (ordered.length === subTodos.length) {
    return ordered;
  }

  const used = new Set(ordered.map((subTodo) => subTodo.id));
  return [...ordered, ...subTodos.filter((subTodo) => !used.has(subTodo.id))];
}

export function buildTodoReorderUpdates(
  orderedTodos: readonly TodoWithSubTodos[],
  nextOrder: readonly string[],
): ReorderUpdate[] {
  const todoById = new Map(orderedTodos.map((todo) => [todo.id, todo]));

  return nextOrder
    .map((todoId, orderIndex) => {
      const todo = todoById.get(todoId);
      if (!todo || todo.order_index === orderIndex) {
        return null;
      }

      return {
        id: todo.id,
        orderIndex,
      };
    })
    .filter((item): item is ReorderUpdate => Boolean(item));
}

export function buildSubTodoReorderUpdates(
  orderedSubTodos: readonly SubTodo[],
  nextOrder: readonly string[],
): ReorderUpdate[] {
  const subTodoById = new Map(orderedSubTodos.map((subTodo) => [subTodo.id, subTodo]));

  return nextOrder
    .map((subTodoId, orderIndex) => {
      const subTodo = subTodoById.get(subTodoId);
      if (!subTodo || subTodo.order_index === orderIndex) {
        return null;
      }

      return {
        id: subTodo.id,
        orderIndex,
      };
    })
    .filter((item): item is ReorderUpdate => Boolean(item));
}
