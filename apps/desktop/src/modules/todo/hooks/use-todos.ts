import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSubTodo,
  createTodo,
  deleteSubTodo,
  deleteTodo,
  getTodo,
  getTodos,
  updateSubTodo,
  updateTodo,
} from "@/modules/todo/api/todo";
import type {
  CreateSubTodoInput,
  CreateTodoInput,
  UpdateSubTodoInput,
  UpdateTodoInput,
} from "@/modules/todo/types";

const TODO_QUERY_KEY = ["todo", "items"] as const;

export function useTodos() {
  return useQuery({
    queryKey: TODO_QUERY_KEY,
    queryFn: getTodos,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useTodo(todoId: string | null) {
  return useQuery({
    queryKey: ["todo", "item", todoId],
    queryFn: () => getTodo(todoId as string),
    enabled: Boolean(todoId),
    staleTime: 0,
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
