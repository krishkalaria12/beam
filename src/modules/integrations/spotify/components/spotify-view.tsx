import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  ArrowLeftRight,
  Disc3,
  ExternalLink,
  Loader2,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useSpotifyAuth } from "../hooks/use-spotify-auth";
import { useSpotifyDevices } from "../hooks/use-spotify-devices";
import { useSpotifyPlayback } from "../hooks/use-spotify-playback";
import { useSpotifySearch } from "../hooks/use-spotify-search";
import { setStoredSpotifyClientId } from "../lib/oauth-session";
import type { SpotifyTrack } from "../types";

interface SpotifyViewProps {
  initialQuery: string;
  onBack: () => void;
}

async function openUrl(url: string) {
  if (isTauri()) {
    await openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function formatDuration(durationMs?: number) {
  if (!durationMs || !Number.isFinite(durationMs)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function toArtists(track?: SpotifyTrack | null) {
  if (!track?.artists?.length) {
    return "Unknown artist";
  }

  return track.artists.map((artist) => artist.name).join(", ");
}

export function SpotifyView({ initialQuery, onBack }: SpotifyViewProps) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const clientIdInputRef = useRef<HTMLInputElement>(null);

  const {
    clientId,
    setClientId,
    isConnected,
    isAuthorizing,
    statusLabel,
    user,
    error,
    setError,
    connect,
    disconnect,
    ensureAccessToken,
    refreshUserProfile,
  } = useSpotifyAuth();

  const {
    playback,
    isLoadingPlayback,
    playbackError,
    refreshPlayback,
    play,
    pause,
    next,
    previous,
    isActionPending,
  } = useSpotifyPlayback({
    connected: isConnected,
    ensureAccessToken,
    selectedDeviceId: selectedDeviceId || undefined,
  });

  const {
    devices,
    isLoadingDevices,
  } = useSpotifyDevices({
    connected: isConnected,
    ensureAccessToken,
  });

  const {
    results: searchResults,
    isSearching,
    searchError,
    search,
  } = useSpotifySearch({ ensureAccessToken });

  useEffect(() => {
    setSearchInput(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (clientId.trim()) {
      return;
    }

    clientIdInputRef.current?.focus();
  }, [clientId]);

  const mergedError =
    localError ||
    error ||
    (playbackError instanceof Error ? playbackError.message : null) ||
    (searchError instanceof Error ? searchError.message : null);

  const nowPlaying = playback?.item ?? null;
  const nowPlayingArtists = useMemo(() => toArtists(nowPlaying), [nowPlaying]);
  const nowPlayingImage = nowPlaying?.album?.images?.[0]?.url;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  useEffect(() => {
    if (selectedDeviceId) {
      return;
    }

    const activeDeviceId = playback?.device?.id;
    if (activeDeviceId) {
      setSelectedDeviceId(activeDeviceId);
      return;
    }

    if (devices.length > 0) {
      setSelectedDeviceId(devices[0]?.id ?? "");
    }
  }, [devices, playback?.device?.id, selectedDeviceId]);

  const handleConnect = useCallback(async () => {
    setLocalError(null);
    setError(null);

    try {
      await connect();
    } catch (connectError) {
      setLocalError(connectError instanceof Error ? connectError.message : "Failed to connect Spotify.");
    }
  }, [connect, setError]);

  const handleDisconnect = useCallback(async () => {
    setLocalError(null);
    setError(null);

    try {
      await disconnect();
      toast.success("Spotify disconnected");
    } catch (disconnectError) {
      setLocalError(disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect Spotify.");
    }
  }, [disconnect, setError]);

  const runPlaybackAction = useCallback(async (action: "play" | "pause" | "next" | "previous") => {
    setLocalError(null);
    setError(null);

    try {
      if (action === "play") {
        await play();
      } else if (action === "pause") {
        await pause();
      } else if (action === "next") {
        await next();
      } else {
        await previous();
      }
    } catch (actionError) {
      setLocalError(actionError instanceof Error ? actionError.message : "Spotify playback action failed.");
    }
  }, [next, pause, play, previous, setError]);

  const runSearch = useCallback(async () => {
    const normalizedQuery = searchInput.trim();
    if (!normalizedQuery) {
      return;
    }

    setLocalError(null);
    setError(null);

    try {
      await search(normalizedQuery);
    } catch (searchErrorValue) {
      setLocalError(searchErrorValue instanceof Error ? searchErrorValue.message : "Spotify search failed.");
    }
  }, [search, searchInput, setError]);

  const statusTone =
    statusLabel === "connected"
      ? "success"
      : statusLabel === "authorizing" || statusLabel === "refreshing"
        ? "info"
        : "warning";

  return (
    <div className="glass-effect flex h-full w-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="Spotify"
          subtitle="OAuth, now playing, playback, and search"
        />
        <div className="ml-auto">
          <CommandStatusChip
            tone={statusTone}
            pulse={statusLabel === "authorizing" || statusLabel === "refreshing"}
            label={statusLabel}
          />
        </div>
      </CommandPanelHeader>

      <div className="list-area custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Connection
            </p>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-8 gap-1.5"
                >
                  <Unplug className="size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isAuthorizing || !clientId.trim()}
                  className="h-8 gap-1.5"
                >
                  {isAuthorizing ? <Loader2 className="size-3.5 animate-spin" /> : <Music className="size-3.5" />}
                  Connect Spotify
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <Input
              ref={clientIdInputRef}
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setStoredSpotifyClientId(event.target.value);
              }}
              placeholder="Spotify Client ID"
              className="h-9 border-border/70 bg-muted/15 text-sm"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Create a Spotify app and add <span className="font-mono">beam://oauth</span> as redirect URI.
            </p>
          </div>

          {user ? (
            <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Connected as <span className="font-medium text-foreground">{user.display_name || user.id}</span>
              {user.email ? ` • ${user.email}` : ""}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Now Playing
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  void refreshPlayback();
                  void refreshUserProfile();
                }}
                disabled={!isConnected || isLoadingPlayback}
              >
                <RefreshCw className={cn("size-3.5", isLoadingPlayback && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  void openUrl("https://open.spotify.com/");
                }}
              >
                <ExternalLink className="size-3.5" />
                Web Player
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/15 p-2.5">
            <div className="size-14 overflow-hidden rounded-md border border-border/50 bg-muted/20">
              {nowPlayingImage ? (
                <img src={nowPlayingImage} alt={nowPlaying?.name ?? "album art"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                  <Disc3 className="size-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {nowPlaying?.name || (isConnected ? "Nothing playing" : "Connect Spotify to view playback")}
              </p>
              <p className="truncate text-xs text-muted-foreground">{nowPlayingArtists}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                {nowPlaying ? formatDuration(nowPlaying.duration_ms) : "--:--"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              Playback device
            </p>
            <Select
              value={selectedDeviceId || playback?.device?.id || ""}
              onValueChange={(value: string | null) => {
                if (!value) {
                  return;
                }
                setSelectedDeviceId(value);
              }}
            >
              <SelectTrigger className="h-9 w-full border-border bg-muted/20 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <Radio className="size-3.5 text-muted-foreground/70" />
                  <span className="truncate text-foreground/90">
                    {selectedDevice?.name || playback?.device?.name || "Select device"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingDevices ? (
              <p className="text-[11px] text-muted-foreground/65">Loading devices…</p>
            ) : devices.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/65">
                No active Spotify devices found. Open Spotify on a device first.
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-8 w-8"
              onClick={() => {
                void runPlaybackAction("previous");
              }}
              disabled={!isConnected || isActionPending}
            >
              <SkipBack className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="default"
              size="icon-sm"
              className="h-8 w-8"
              onClick={() => {
                void runPlaybackAction(playback?.is_playing ? "pause" : "play");
              }}
              disabled={!isConnected || isActionPending}
            >
              {playback?.is_playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-8 w-8"
              onClick={() => {
                void runPlaybackAction("next");
              }}
              disabled={!isConnected || isActionPending}
            >
              <SkipForward className="size-3.5" />
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Search Tracks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="Search tracks, artists, albums"
              className="h-9 border-border/70 bg-muted/15 text-sm"
            />

            <Button
              type="button"
              onClick={() => {
                void runSearch();
              }}
              disabled={!isConnected || isSearching || !searchInput.trim()}
              className="h-9 px-3"
            >
              {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground/75">
                {isConnected ? "Search for a song to see quick results." : "Connect Spotify first, then search tracks."}
              </p>
            ) : (
              searchResults.map((track) => (
                <div key={track.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{track.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{toArtists(track)}</p>
                  </div>

                  {track.external_urls?.spotify ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2"
                      onClick={() => {
                        void openUrl(track.external_urls!.spotify!);
                      }}
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        {mergedError ? (
          <div className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {mergedError}
          </div>
        ) : null}
      </div>

      <CommandFooterBar
        leftSlot={(
          <>
            <CommandKeyHint keyLabel="esc" label="Back" />
            <CommandKeyHint keyLabel="enter" label="Search" />
            <CommandKeyHint keyLabel={["⌘", "enter"]} label="Connect" />
          </>
        )}
        rightSlot={(
          <div className="flex items-center gap-1 text-muted-foreground/70">
            <ArrowLeftRight className="size-3" />
            <span>Spotify</span>
          </div>
        )}
      />
    </div>
  );
}
