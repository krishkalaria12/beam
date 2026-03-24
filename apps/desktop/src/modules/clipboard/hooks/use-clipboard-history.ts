import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { getClipboardHistory } from "../api/get-clipboard-history";
import { CLIPBOARD_HISTORY_UPDATED_EVENT } from "../lib/updates";

export function useClipboardHistory(enabled: boolean) {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    if (!enabled) return;

    const invalidateHistory = () => {
      queryClient.invalidateQueries({ queryKey: ["clipboard", "history"] });
    };

    window.addEventListener(CLIPBOARD_HISTORY_UPDATED_EVENT, invalidateHistory);

    return () => {
      window.removeEventListener(CLIPBOARD_HISTORY_UPDATED_EVENT, invalidateHistory);
    };
  });

  return useQuery({
    queryKey: ["clipboard", "history"],
    queryFn: getClipboardHistory,
    enabled,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => (enabled && query.state.status !== "error" ? 2_000 : false),
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid clipboard history response")) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
