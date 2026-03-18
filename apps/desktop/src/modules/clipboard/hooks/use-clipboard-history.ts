import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onClipboardUpdate, startListening } from "tauri-plugin-clipboard-api";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { getClipboardHistory } from "../api/get-clipboard-history";
import { CLIPBOARD_HISTORY_UPDATED_EVENT } from "../lib/updates";

export function useClipboardHistory(enabled: boolean) {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    if (!enabled) return;

    let unlistenClipboard: (() => void) | undefined;
    let stopListening: (() => Promise<void>) | undefined;
    const invalidateHistory = () => {
      queryClient.invalidateQueries({ queryKey: ["clipboard", "history"] });
    };

    const setupListener = async () => {
      try {
        stopListening = await startListening();
        unlistenClipboard = await onClipboardUpdate(invalidateHistory);
      } catch (error) {
        console.error("Failed to setup clipboard listener:", error);
      }
    };

    setupListener();
    window.addEventListener(CLIPBOARD_HISTORY_UPDATED_EVENT, invalidateHistory);

    return () => {
      window.removeEventListener(CLIPBOARD_HISTORY_UPDATED_EVENT, invalidateHistory);

      if (unlistenClipboard) {
        unlistenClipboard();
      }

      if (stopListening) {
        void stopListening();
      }
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
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid clipboard history response")) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
