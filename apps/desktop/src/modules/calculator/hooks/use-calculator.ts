import { useQuery } from "@tanstack/react-query";
import debounce from "@/lib/debounce";
import { useEffect, useState } from "react";

import { calculateExpression } from "../api/calculate-expression";
import { looksLikeCalculationQuery } from "../lib/query-match";

export function useCalculator(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const updateQuery = debounce((nextQuery: string) => {
      setDebouncedQuery(nextQuery.trim());
    }, 160);

    updateQuery(query);

    return () => {
      updateQuery.clear();
    };
  }, [query]);

  const normalizedQuery = debouncedQuery.trim().replace(/\s+/g, " ");
  const shouldRunCalculator = looksLikeCalculationQuery(normalizedQuery);

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
