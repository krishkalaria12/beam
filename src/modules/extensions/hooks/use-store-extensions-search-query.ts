import { useQuery } from "@tanstack/react-query";

import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import {
  EXTENSIONS_QUERY_KEY_STORE,
  EXTENSIONS_STORE_SEARCH_MIN_LENGTH,
  EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
  EXTENSIONS_STORE_VIEW_SEARCH_LIMIT,
} from "@/modules/extensions/constants";

export function useStoreExtensionsSearchQuery(searchTerm: string) {
  const normalizedSearchTerm = searchTerm.trim();

  return useQuery({
    queryKey: [...EXTENSIONS_QUERY_KEY_STORE, normalizedSearchTerm],
    queryFn: () => searchStoreExtensions(normalizedSearchTerm, EXTENSIONS_STORE_VIEW_SEARCH_LIMIT),
    enabled: normalizedSearchTerm.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH,
    staleTime: EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
  });
}
