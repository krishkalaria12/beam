import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  pinnedCalculatorHistoryQueryKey,
  setCalculatorHistoryEntryPinned,
} from "@/modules/calculator-history/api/history-actions";
import type { CalculatorHistoryEntry } from "@/modules/calculator-history/api/get-calculator-history";
import { getPinnedCalculatorHistoryQueryOptions } from "@/modules/calculator-history/api/query";

export function usePinnedCalculatorHistory() {
  return useQuery(getPinnedCalculatorHistoryQueryOptions());
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
