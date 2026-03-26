import type { QueryClient } from "@tanstack/react-query";

import { getNotes } from "@/modules/notes/api/notes";

export const NOTES_QUERY_KEY = ["notes", "items"] as const;
export const NOTES_STALE_TIME_MS = 30_000;
export const NOTES_GC_TIME_MS = 1000 * 60 * 10;

export function getNotesQueryOptions() {
  return {
    queryKey: NOTES_QUERY_KEY,
    queryFn: getNotes,
    staleTime: NOTES_STALE_TIME_MS,
    gcTime: NOTES_GC_TIME_MS,
    refetchOnWindowFocus: false,
  };
}

export async function warmNotesData(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData(getNotesQueryOptions());
}
