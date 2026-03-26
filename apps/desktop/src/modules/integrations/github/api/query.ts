import type { QueryClient } from "@tanstack/react-query";

import { githubGetAssignedIssues } from "@/modules/integrations/github/api/github";
import { ensureGithubStoredAccessToken } from "@/modules/integrations/github/api/access-token";

const ASSIGNED_ITEMS_PER_PAGE = 20;

export const GITHUB_ASSIGNED_ITEMS_QUERY_KEY = ["github", "assigned-items"] as const;
export const GITHUB_ASSIGNED_ITEMS_STALE_TIME_MS = 30_000;
export const GITHUB_ASSIGNED_ITEMS_GC_TIME_MS = 1000 * 60 * 10;

export async function fetchGithubAssignedItems(accessToken: string) {
  return githubGetAssignedIssues({
    accessToken,
    state: "open",
    sort: "updated",
    direction: "desc",
    perPage: ASSIGNED_ITEMS_PER_PAGE,
    page: 1,
  });
}

export function getGithubAssignedItemsQueryOptions(
  ensureAccessToken: () => Promise<string | null>,
) {
  return {
    queryKey: GITHUB_ASSIGNED_ITEMS_QUERY_KEY,
    queryFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return [];
      }

      return fetchGithubAssignedItems(accessToken);
    },
    staleTime: GITHUB_ASSIGNED_ITEMS_STALE_TIME_MS,
    gcTime: GITHUB_ASSIGNED_ITEMS_GC_TIME_MS,
    refetchOnWindowFocus: false,
  };
}

export async function warmGithubAssignedItemsData(queryClient: QueryClient): Promise<void> {
  try {
    const accessToken = await ensureGithubStoredAccessToken();
    if (!accessToken) {
      return;
    }

    await queryClient.ensureQueryData(
      getGithubAssignedItemsQueryOptions(() => Promise.resolve(accessToken)),
    );
  } catch {
    // Auth refresh failures should not block launcher panel preparation.
  }
}
