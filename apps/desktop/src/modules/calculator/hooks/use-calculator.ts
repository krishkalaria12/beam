import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";

import { getCalculatorQueryOptions } from "../api/query";

export function useCalculator(query: string) {
  const debouncedQuery = useDeferredValue(query.trim());

  return useQuery(getCalculatorQueryOptions(debouncedQuery));
}
