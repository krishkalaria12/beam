import type { QueryClient } from "@tanstack/react-query";

import { searchFiles } from "@/modules/file-search/api/search-files";
import type { SearchRequest } from "@/modules/file-search/types";

const FILE_SEARCH_QUERY_KEY = ["file-search"] as const;
const FILE_SEARCH_STALE_TIME_MS = 1000 * 60 * 5;

export function getFileSearchQueryOptions(query: string, page = 1, perPage = 50) {
  const normalizedQuery = query.trim();
  const request: SearchRequest = {
    query: normalizedQuery,
    page,
    per_page: perPage,
  };

  return {
    queryKey: [...FILE_SEARCH_QUERY_KEY, normalizedQuery, page, perPage] as const,
    queryFn: () => searchFiles(request),
    enabled: normalizedQuery.length > 0,
    staleTime: FILE_SEARCH_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  };
}

export async function warmFileSearchData(
  queryClient: QueryClient,
  query: string,
  page = 1,
  perPage = 50,
): Promise<void> {
  const { enabled, ...queryOptions } = getFileSearchQueryOptions(query, page, perPage);
  if (!enabled) {
    return;
  }

  await queryClient.ensureQueryData(queryOptions);
}
