import type { QueryClient } from "@tanstack/react-query";

import { getCalculatorHistory } from "@/modules/calculator-history/api/get-calculator-history";
import {
  getPinnedCalculatorHistoryTimestamps,
  pinnedCalculatorHistoryQueryKey,
} from "@/modules/calculator-history/api/history-actions";

export const calculatorHistoryQueryKey = ["calculator", "history"] as const;
const CALCULATOR_HISTORY_STALE_TIME_MS = 15_000;

export function getCalculatorHistoryQueryOptions() {
  return {
    queryKey: calculatorHistoryQueryKey,
    queryFn: getCalculatorHistory,
    staleTime: CALCULATOR_HISTORY_STALE_TIME_MS,
  };
}

export function getPinnedCalculatorHistoryQueryOptions() {
  return {
    queryKey: pinnedCalculatorHistoryQueryKey,
    queryFn: getPinnedCalculatorHistoryTimestamps,
    staleTime: Infinity,
  };
}

export async function warmCalculatorHistoryData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.ensureQueryData(getCalculatorHistoryQueryOptions()),
    queryClient.ensureQueryData(getPinnedCalculatorHistoryQueryOptions()),
  ]);
}
