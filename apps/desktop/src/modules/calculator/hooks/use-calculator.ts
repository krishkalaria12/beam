import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";

import { calculateExpression } from "../api/calculate-expression";

export function useCalculator(query: string) {
  const debouncedQuery = useDeferredValue(query.trim());

  const normalizedQuery = debouncedQuery.trim().replace(/\s+/g, " ");
  const shouldRunCalculator = normalizedQuery.length > 0;

  return useQuery({
    queryKey: ["calculator", normalizedQuery],
    queryFn: () => calculateExpression(normalizedQuery),
    enabled: shouldRunCalculator,
    staleTime: 8_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid calculator response")) {
        return false;
      }

      return failureCount < 1;
    },
  });
}
