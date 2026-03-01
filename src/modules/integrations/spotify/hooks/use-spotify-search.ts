import { useMutation } from "@tanstack/react-query";

import { spotifySearch } from "../api/spotify";
import type { SpotifySearchTracksResult, SpotifyTrack } from "../types";

interface UseSpotifySearchOptions {
  ensureAccessToken: () => Promise<string | null>;
}

function normalizeTracks(payload: SpotifySearchTracksResult | null | undefined): SpotifyTrack[] {
  if (!payload?.tracks?.items) {
    return [];
  }

  return payload.tracks.items;
}

export function useSpotifySearch({ ensureAccessToken }: UseSpotifySearchOptions) {
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        return [] as SpotifyTrack[];
      }

      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error("Spotify is not connected.");
      }

      const result = await spotifySearch({
        accessToken,
        query: normalizedQuery,
        types: ["track"],
        limit: 8,
      });

      return normalizeTracks(result);
    },
  });

  return {
    results: searchMutation.data ?? [],
    isSearching: searchMutation.isPending,
    searchError: searchMutation.error,
    search: searchMutation.mutateAsync,
    clear: searchMutation.reset,
  };
}
