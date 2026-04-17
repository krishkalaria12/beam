import { useQuery } from "@tanstack/react-query";

import { getFileSearchBackendStatus } from "../api/get-file-search-backend-status";

const FILE_SEARCH_BACKEND_STATUS_QUERY_KEY = ["file-search-backend-status"] as const;

export function useFileSearchBackendStatus() {
  return useQuery({
    queryKey: FILE_SEARCH_BACKEND_STATUS_QUERY_KEY,
    queryFn: getFileSearchBackendStatus,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
