import { useQuery } from "@tanstack/react-query";

import { getStoreExtensionUpdates } from "@/modules/extensions/api/get-store-extension-updates";
import {
  EXTENSIONS_QUERY_KEY_INSTALLED,
  EXTENSIONS_QUERY_KEY_STORE_UPDATES,
  EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
} from "@/modules/extensions/constants";

export function useStoreExtensionUpdatesQuery() {
  return useQuery({
    queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES,
    queryFn: getStoreExtensionUpdates,
    staleTime: EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Installed extension changes are the thing that invalidate update checks.
    meta: {
      invalidatedBy: EXTENSIONS_QUERY_KEY_INSTALLED,
    },
  });
}
