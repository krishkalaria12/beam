import type { QueryClient } from "@tanstack/react-query";

import { getFocusStatus } from "@/modules/focus/api/focus";

export const FOCUS_STATUS_QUERY_KEY = ["focus", "status"] as const;

export function getFocusStatusQueryOptions() {
  return {
    queryKey: FOCUS_STATUS_QUERY_KEY,
    queryFn: getFocusStatus,
    staleTime: 500,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
  };
}

export async function warmFocusStatusData(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData(getFocusStatusQueryOptions());
}
