import { useQuery } from "@tanstack/react-query";

import { getCalculatorHistoryQueryOptions } from "../api/query";

export function useCalculatorHistory(enabled: boolean) {
  return useQuery({
    ...getCalculatorHistoryQueryOptions(),
    enabled,
  });
}
