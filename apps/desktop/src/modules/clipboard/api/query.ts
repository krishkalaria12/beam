import type { QueryClient } from "@tanstack/react-query";

import { getClipboardHistory } from "@/modules/clipboard/api/get-clipboard-history";

export const CLIPBOARD_HISTORY_QUERY_KEY = ["clipboard", "history"] as const;
export const CLIPBOARD_HISTORY_STALE_TIME_MS = 15_000;
export const CLIPBOARD_HISTORY_GC_TIME_MS = 10 * 60_000;

export function getClipboardHistoryQueryOptions() {
  return {
    queryKey: CLIPBOARD_HISTORY_QUERY_KEY,
    queryFn: getClipboardHistory,
    staleTime: CLIPBOARD_HISTORY_STALE_TIME_MS,
    gcTime: CLIPBOARD_HISTORY_GC_TIME_MS,
  };
}

export async function warmClipboardHistoryData(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData(getClipboardHistoryQueryOptions());
}
