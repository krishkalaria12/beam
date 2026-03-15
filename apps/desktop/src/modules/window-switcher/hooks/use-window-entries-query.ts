import { useQuery } from "@tanstack/react-query";

import { listWindows } from "@/modules/window-switcher/api/list-windows";

const WINDOW_ENTRIES_QUERY_KEY = ["window-switcher", "entries"] as const;
const REFRESH_INTERVAL_MS = 1500;

export function useWindowEntriesQuery(enabled = true) {
  return useQuery({
    queryKey: WINDOW_ENTRIES_QUERY_KEY,
    queryFn: listWindows,
    enabled,
    staleTime: 1000,
    gcTime: 30_000,
    refetchInterval: enabled ? REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });
}

export function getWindowEntriesQueryKey() {
  return WINDOW_ENTRIES_QUERY_KEY;
}
