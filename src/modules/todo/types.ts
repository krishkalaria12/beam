import { z } from "zod";

export const subTodoSchema = z.object({
  id: z.string(),
  todo_id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  order_index: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const todoWithSubTodosSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  order_index: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
  sub_todos: z.array(subTodoSchema),
});

export const todoWithSubTodosListSchema = z.array(todoWithSubTodosSchema);

export type SubTodo = z.infer<typeof subTodoSchema>;
export type TodoWithSubTodos = z.infer<typeof todoWithSubTodosSchema>;

export interface CreateTodoInput {
  title: string;
  orderIndex?: number;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  completed?: boolean;
  orderIndex?: number;
}

export interface CreateSubTodoInput {
  todoId: string;
  title: string;
  orderIndex?: number;
}

export interface UpdateSubTodoInput {
  id: string;
  title?: string;
  completed?: boolean;
  orderIndex?: number;
}
