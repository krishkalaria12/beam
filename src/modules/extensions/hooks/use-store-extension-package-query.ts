import { useQuery } from "@tanstack/react-query";

import { getStoreExtensionPackage } from "@/modules/extensions/api/get-store-extension-package";
import {
  EXTENSIONS_QUERY_KEY_STORE,
  EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
} from "@/modules/extensions/constants";

export function useStoreExtensionPackageQuery(packageId: string | null) {
  const normalizedPackageId = packageId?.trim() ?? "";

  return useQuery({
    queryKey: [...EXTENSIONS_QUERY_KEY_STORE, "package", normalizedPackageId],
    queryFn: () => getStoreExtensionPackage(normalizedPackageId),
    enabled: normalizedPackageId.length > 0,
    staleTime: EXTENSIONS_STORE_SEARCH_STALE_TIME_MS,
  });
}
