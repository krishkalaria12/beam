import { useQuery } from "@tanstack/react-query";
import { searchFiles } from "../api/search-files";
import type { SearchRequest } from "../types";

export function useFileSearch(query: string, page = 1, perPage = 50) {
  const request: SearchRequest = {
    query,
    page,
    per_page: perPage,
  };

  return useQuery({
    queryKey: ["file-search", query, page, perPage],
    queryFn: () => searchFiles(request),
    enabled: !!query && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });
}
