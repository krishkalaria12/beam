import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPinnedCalculatorHistoryTimestamps,
  pinnedCalculatorHistoryQueryKey,
  setCalculatorHistoryEntryPinned,
} from "@/modules/calculator-history/api/history-actions";
import type { CalculatorHistoryEntry } from "@/modules/calculator-history/api/get-calculator-history";

export function usePinnedCalculatorHistory() {
  return useQuery({
    queryKey: pinnedCalculatorHistoryQueryKey,
    queryFn: getPinnedCalculatorHistoryTimestamps,
    staleTime: Infinity,
  });
}

export function useSetPinnedCalculatorHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entry, pinned }: { entry: CalculatorHistoryEntry; pinned: boolean }) =>
      setCalculatorHistoryEntryPinned(entry, pinned),
    onSuccess: (timestamps) => {
      queryClient.setQueryData(pinnedCalculatorHistoryQueryKey, timestamps);
    },
  });
}
