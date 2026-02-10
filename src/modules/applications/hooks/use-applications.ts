import { useQuery } from "@tanstack/react-query";
import { getApplications } from "../api/get-applications";

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: getApplications,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid applications response")) {
        return false;
      }

      return failureCount < 2;
    },
  });
}
