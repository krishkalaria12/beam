import type { QueryClient } from "@tanstack/react-query";

import { getTodo, getTodos } from "@/modules/todo/api/todo";

export const TODO_QUERY_KEY = ["todo", "items"] as const;
export const TODO_ITEM_QUERY_KEY = ["todo", "item"] as const;
export const TODO_STALE_TIME_MS = 30_000;
export const TODO_GC_TIME_MS = 1000 * 60 * 10;

export function getTodosQueryOptions() {
  return {
    queryKey: TODO_QUERY_KEY,
    queryFn: getTodos,
    staleTime: TODO_STALE_TIME_MS,
    gcTime: TODO_GC_TIME_MS,
    refetchOnWindowFocus: false,
  };
}

export function getTodoQueryOptions(todoId: string) {
  return {
    queryKey: [...TODO_ITEM_QUERY_KEY, todoId] as const,
    queryFn: () => getTodo(todoId),
    staleTime: TODO_STALE_TIME_MS,
    gcTime: TODO_GC_TIME_MS,
    refetchOnWindowFocus: false,
  };
}

export async function warmTodosData(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData(getTodosQueryOptions());
}
