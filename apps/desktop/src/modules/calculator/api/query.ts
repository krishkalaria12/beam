import type { QueryClient } from "@tanstack/react-query";

import { calculateExpression } from "./calculate-expression";

const CALCULATOR_QUERY_KEY = ["calculator"] as const;
const CALCULATOR_STALE_TIME_MS = 8_000;
const CALCULATOR_GC_TIME_MS = 30 * 60_000;

function normalizeCalculatorQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

export function getCalculatorQueryOptions(query: string) {
  const normalizedQuery = normalizeCalculatorQuery(query);

  return {
    queryKey: [...CALCULATOR_QUERY_KEY, normalizedQuery] as const,
    queryFn: () => calculateExpression(normalizedQuery),
    enabled: normalizedQuery.length > 0,
    staleTime: CALCULATOR_STALE_TIME_MS,
    gcTime: CALCULATOR_GC_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, error: unknown) => {
      if (error instanceof Error && error.message.includes("invalid calculator response")) {
        return false;
      }

      return failureCount < 1;
    },
  };
}

export async function warmCalculatorData(queryClient: QueryClient, query: string) {
  const { enabled, ...queryOptions } = getCalculatorQueryOptions(query);
  if (!enabled) {
    return null;
  }

  return queryClient.ensureQueryData(queryOptions);
}
