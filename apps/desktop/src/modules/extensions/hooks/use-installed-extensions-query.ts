import { useQuery } from "@tanstack/react-query";

import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { EXTENSIONS_QUERY_KEY_INSTALLED } from "@/modules/extensions/constants";

export function useInstalledExtensionsQuery() {
  return useQuery({
    queryKey: EXTENSIONS_QUERY_KEY_INSTALLED,
    queryFn: getDiscoveredPlugins,
  });
}
