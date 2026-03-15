import { useQuery } from "@tanstack/react-query";

import { spotifyGetDevices } from "../api/spotify";
import type { SpotifyDevice } from "../types";

interface UseSpotifyDevicesOptions {
  connected: boolean;
  ensureAccessToken: () => Promise<string | null>;
}

export function useSpotifyDevices({ connected, ensureAccessToken }: UseSpotifyDevicesOptions) {
  const devicesQuery = useQuery({
    queryKey: ["spotify", "devices"],
    enabled: connected,
    queryFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return [] as SpotifyDevice[];
      }

      const response = await spotifyGetDevices(accessToken);
      return response.devices ?? [];
    },
    refetchInterval: connected ? 10_000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    devices: devicesQuery.data ?? [],
    isLoadingDevices: devicesQuery.isLoading,
    devicesError: devicesQuery.error,
    refreshDevices: devicesQuery.refetch,
  };
}
