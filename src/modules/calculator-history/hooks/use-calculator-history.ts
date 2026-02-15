import { useQuery } from "@tanstack/react-query";

import { getCalculatorHistory } from "../api/get-calculator-history";

export function useCalculatorHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["calculator", "history"],
    queryFn: getCalculatorHistory,
    enabled,
    refetchOnMount: true,
  });
}
