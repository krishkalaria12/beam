import { useQuery } from "@tanstack/react-query";

import { getInstalledExtensionsQueryOptions } from "@/modules/extensions/api/query";

export function useInstalledExtensionsQuery() {
  return useQuery(getInstalledExtensionsQueryOptions());
}
