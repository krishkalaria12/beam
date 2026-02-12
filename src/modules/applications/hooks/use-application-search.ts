import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import debounce from "debounce";
import { useEffect, useState } from "react";

import { searchApplications } from "../api/search-applications";

const APPLICATIONS_CACHE_UPDATED_EVENT = "applications-cache-updated";

export function useApplicationSearch(query: string) {
  const queryClient = useQueryClient();
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const updateQuery = debounce((nextQuery: string) => {
      setDebouncedQuery(nextQuery);
    }, 140);

    updateQuery(query.trim());

    return () => {
      updateQuery.clear();
    };
  }, [query]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: UnlistenFn | null = null;

    listen(APPLICATIONS_CACHE_UPDATED_EVENT, () => {
      queryClient.invalidateQueries({ queryKey: ["applications", "search"] });
    })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch(() => {
        unlisten = null;
      });

    return () => {
      unlisten?.();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["applications", "search", debouncedQuery],
    queryFn: () => searchApplications(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("invalid application search response")) {
        return false;
      }

      return failureCount < 1;
    },
  });
}
