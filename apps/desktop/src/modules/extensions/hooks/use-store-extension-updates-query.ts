import { useQuery } from "@tanstack/react-query";

import { getStoreExtensionUpdatesQueryOptions } from "@/modules/extensions/api/query";

export function useStoreExtensionUpdatesQuery() {
  return useQuery(getStoreExtensionUpdatesQueryOptions());
}
