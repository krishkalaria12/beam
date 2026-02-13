import { useQuery } from "@tanstack/react-query";

import { getClipboardHistory } from "../api/get-clipboard-history";

export function useClipboardHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["clipboard", "history"],
    queryFn: getClipboardHistory,
    enabled,
    staleTime: 800,
    gcTime: 10 * 60_000,
    refetchInterval: enabled ? 1_500 : false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid clipboard history response")) {
        return false;
      }

      return failureCount < 1;
    },
  });
}
