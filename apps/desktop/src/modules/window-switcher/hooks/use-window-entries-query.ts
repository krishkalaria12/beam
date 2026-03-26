import { useQuery } from "@tanstack/react-query";

import {
  getWindowEntriesQueryOptions,
  WINDOW_ENTRIES_QUERY_KEY,
} from "@/modules/window-switcher/api/query";

export function useWindowEntriesQuery(enabled = true) {
  return useQuery({
    ...getWindowEntriesQueryOptions(enabled),
  });
}

export function getWindowEntriesQueryKey() {
  return WINDOW_ENTRIES_QUERY_KEY;
}
