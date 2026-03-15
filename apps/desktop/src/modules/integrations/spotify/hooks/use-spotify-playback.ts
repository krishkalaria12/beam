import { useMutation, useQuery } from "@tanstack/react-query";

import {
  spotifyGetCurrentPlayback,
  spotifyNextTrack,
  spotifyPause,
  spotifyPlay,
  spotifyPreviousTrack,
} from "../api/spotify";
import type { SpotifyPlayback } from "../types";

interface UseSpotifyPlaybackOptions {
  connected: boolean;
  ensureAccessToken: () => Promise<string | null>;
  selectedDeviceId?: string | null;
}

export function useSpotifyPlayback({
  connected,
  ensureAccessToken,
  selectedDeviceId,
}: UseSpotifyPlaybackOptions) {
  const playbackQuery = useQuery({
    queryKey: ["spotify", "playback"],
    enabled: connected,
    queryFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return null;
      }

      const result = await spotifyGetCurrentPlayback(accessToken);
      return (result ?? null) as SpotifyPlayback | null;
    },
    refetchInterval: connected ? 5000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const playMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error("Spotify is not connected.");
      }

      const activeDeviceId = selectedDeviceId || playbackQuery.data?.device?.id;
      await spotifyPlay({ accessToken, deviceId: activeDeviceId });
    },
    onSuccess: () => {
      void playbackQuery.refetch();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error("Spotify is not connected.");
      }

      const activeDeviceId = selectedDeviceId || playbackQuery.data?.device?.id;
      await spotifyPause({ accessToken, deviceId: activeDeviceId });
    },
    onSuccess: () => {
      void playbackQuery.refetch();
    },
  });

  const nextMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error("Spotify is not connected.");
      }

      const activeDeviceId = selectedDeviceId || playbackQuery.data?.device?.id;
      await spotifyNextTrack({ accessToken, deviceId: activeDeviceId });
    },
    onSuccess: () => {
      void playbackQuery.refetch();
    },
  });

  const previousMutation = useMutation({
    mutationFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error("Spotify is not connected.");
      }

      const activeDeviceId = selectedDeviceId || playbackQuery.data?.device?.id;
      await spotifyPreviousTrack({ accessToken, deviceId: activeDeviceId });
    },
    onSuccess: () => {
      void playbackQuery.refetch();
    },
  });

  return {
    playback: playbackQuery.data,
    isLoadingPlayback: playbackQuery.isLoading,
    playbackError: playbackQuery.error,
    refreshPlayback: playbackQuery.refetch,
    play: playMutation.mutateAsync,
    pause: pauseMutation.mutateAsync,
    next: nextMutation.mutateAsync,
    previous: previousMutation.mutateAsync,
    isActionPending:
      playMutation.isPending ||
      pauseMutation.isPending ||
      nextMutation.isPending ||
      previousMutation.isPending,
  };
}
