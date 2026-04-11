import type { QueryClient } from "@tanstack/react-query";

import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { getStoreExtensionUpdates } from "@/modules/extensions/api/get-store-extension-updates";
import {
  EXTENSIONS_QUERY_KEY_INSTALLED,
  EXTENSIONS_QUERY_KEY_STORE_UPDATES,
  EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
} from "@/modules/extensions/constants";

const EXTENSIONS_INSTALLED_STALE_TIME_MS = 30_000;

export function getInstalledExtensionsQueryOptions() {
  return {
    queryKey: EXTENSIONS_QUERY_KEY_INSTALLED,
    queryFn: getDiscoveredPlugins,
    staleTime: EXTENSIONS_INSTALLED_STALE_TIME_MS,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  };
}

export function getStoreExtensionUpdatesQueryOptions() {
  return {
    queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES,
    queryFn: getStoreExtensionUpdates,
    staleTime: EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    meta: {
      invalidatedBy: EXTENSIONS_QUERY_KEY_INSTALLED,
    },
  };
}

export async function warmExtensionsData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.ensureQueryData(getInstalledExtensionsQueryOptions()),
    queryClient.ensureQueryData(getStoreExtensionUpdatesQueryOptions()),
  ]);
}
