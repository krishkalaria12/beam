import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPinnedClipboardEntryIds,
  pinnedClipboardEntriesQueryKey,
  setClipboardEntryPinned,
} from "@/modules/clipboard/api/history-actions";
import type { ClipboardHistoryEntry } from "@/modules/clipboard/types";

export function usePinnedClipboardHistory() {
  return useQuery({
    queryKey: pinnedClipboardEntriesQueryKey,
    queryFn: getPinnedClipboardEntryIds,
    staleTime: Infinity,
  });
}

export function useSetPinnedClipboardHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entry, pinned }: { entry: ClipboardHistoryEntry; pinned: boolean }) =>
      setClipboardEntryPinned(entry, pinned),
    onSuccess: (entryIds) => {
      queryClient.setQueryData(pinnedClipboardEntriesQueryKey, entryIds);
    },
  });
}
