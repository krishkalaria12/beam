import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSubTodo,
  createTodo,
  deleteSubTodo,
  deleteTodo,
  updateSubTodo,
  updateTodo,
} from "@/modules/todo/api/todo";
import {
  getTodoQueryOptions,
  getTodosQueryOptions,
  TODO_QUERY_KEY,
} from "@/modules/todo/api/query";
import type {
  CreateSubTodoInput,
  CreateTodoInput,
  UpdateSubTodoInput,
  UpdateTodoInput,
} from "@/modules/todo/types";

export function useTodos() {
  return useQuery({
    ...getTodosQueryOptions(),
  });
}

export function useTodo(todoId: string | null) {
  return useQuery({
    ...(todoId ? getTodoQueryOptions(todoId) : getTodoQueryOptions("")),
    enabled: Boolean(todoId),
  });
}

export function useCreateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useUpdateTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTodoInput) => updateTodo(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useDeleteTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) => deleteTodo(todoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useCreateSubTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubTodoInput) => createSubTodo(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useUpdateSubTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSubTodoInput) => updateSubTodo(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useDeleteSubTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subTodoId: string) => deleteSubTodo(subTodoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useReorderTodosMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ReadonlyArray<Pick<UpdateTodoInput, "id" | "orderIndex">>) => {
      await Promise.all(
        items.map((item) => updateTodo({ id: item.id, orderIndex: item.orderIndex })),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useReorderSubTodosMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ReadonlyArray<Pick<UpdateSubTodoInput, "id" | "orderIndex">>) => {
      await Promise.all(
        items.map((item) => updateSubTodo({ id: item.id, orderIndex: item.orderIndex })),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}
