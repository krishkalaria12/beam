import type { QueryClient, UseQueryOptions } from "@tanstack/react-query";

import { listWindows } from "@/modules/window-switcher/api/list-windows";
import type { WindowEntry } from "@/modules/window-switcher/types";

export const WINDOW_ENTRIES_QUERY_KEY = ["window-switcher", "entries"] as const;
const WINDOW_ENTRIES_STALE_TIME_MS = 1000;
const WINDOW_ENTRIES_GC_TIME_MS = 30_000;
const WINDOW_ENTRIES_REFRESH_INTERVAL_MS = 1500;

export function getWindowEntriesQueryOptions(
  enabled = true,
): UseQueryOptions<WindowEntry[], Error, WindowEntry[], typeof WINDOW_ENTRIES_QUERY_KEY> {
  return {
    queryKey: WINDOW_ENTRIES_QUERY_KEY,
    queryFn: listWindows,
    enabled,
    staleTime: WINDOW_ENTRIES_STALE_TIME_MS,
    gcTime: WINDOW_ENTRIES_GC_TIME_MS,
    refetchInterval: enabled ? WINDOW_ENTRIES_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  };
}

export async function warmWindowEntriesData(queryClient: QueryClient): Promise<void> {
  const { enabled, ...queryOptions } = getWindowEntriesQueryOptions();
  if (!enabled) {
    return;
  }

  await queryClient.ensureQueryData(queryOptions);
}
