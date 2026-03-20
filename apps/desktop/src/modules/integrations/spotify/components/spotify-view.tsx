import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  ChevronLeft,
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
  Volume2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return <SpotifyViewContent key={initialQuery} initialQuery={initialQuery} onBack={onBack} />;
}

function SpotifyViewContent({ initialQuery, onBack }: SpotifyViewProps) {
  const [searchInput, setSearchInput] = useState(() => initialQuery);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

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

  const { devices, isLoadingDevices } = useSpotifyDevices({
    connected: isConnected,
    ensureAccessToken,
  });

  const {
    results: searchResults,
    isSearching,
    searchError,
    search,
  } = useSpotifySearch({ ensureAccessToken });

  const clientIdInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && !clientId.trim()) {
        node.focus();
      }
    },
    [clientId],
  );

  const mergedError =
    localError ||
    error ||
    (playbackError instanceof Error ? playbackError.message : null) ||
    (searchError instanceof Error ? searchError.message : null);

  const nowPlaying = playback?.item ?? null;
  const nowPlayingArtists = toArtists(nowPlaying);
  const nowPlayingImage = nowPlaying?.album?.images?.[0]?.url;
  const resolvedSelectedDeviceId = selectedDeviceId || playback?.device?.id || devices[0]?.id || "";
  const selectedDevice = devices.find((device) => device.id === resolvedSelectedDeviceId) ?? null;

  if (!selectedDeviceId && resolvedSelectedDeviceId) {
    setSelectedDeviceId(resolvedSelectedDeviceId);
  }

  const handleConnect = useCallback(async () => {
    setLocalError(null);
    setError(null);

    try {
      await connect();
    } catch (connectError) {
      setLocalError(
        connectError instanceof Error ? connectError.message : "Failed to connect Spotify.",
      );
    }
  }, [connect, setError]);

  const handleDisconnect = useCallback(async () => {
    setLocalError(null);
    setError(null);

    try {
      await disconnect();
      toast.success("Spotify disconnected");
    } catch (disconnectError) {
      setLocalError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect Spotify.",
      );
    }
  }, [disconnect, setError]);

  const runPlaybackAction = useCallback(
    async (action: "play" | "pause" | "next" | "previous") => {
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
        setLocalError(
          actionError instanceof Error ? actionError.message : "Spotify playback action failed.",
        );
      }
    },
    [next, pause, play, previous, setError],
  );

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
      setLocalError(
        searchErrorValue instanceof Error ? searchErrorValue.message : "Spotify search failed.",
      );
    }
  }, [search, searchInput, setError]);

  const statusTone =
    statusLabel === "connected"
      ? "success"
      : statusLabel === "authorizing" || statusLabel === "refreshing"
        ? "info"
        : "warning";

  return (
    <div className="spotify-view-enter flex h-full w-full flex-col text-foreground">
      {/* Custom Header */}
      <header className="spotify-header flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
        {/* Back button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Title block */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-chip-bg)] ring-1 ring-[var(--launcher-card-selected-border)]">
            <Music className="size-4 text-[var(--ring)]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-launcher-lg font-semibold tracking-[-0.02em] text-foreground">
              Spotify
            </h1>
            <p className="text-launcher-xs text-muted-foreground">
              Now playing, playback controls & search
            </p>
          </div>
        </div>

        {/* Status chip */}
        <div className="ml-auto">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-launcher-2xs font-semibold uppercase tracking-[0.06em]",
              statusTone === "success" &&
                "bg-[var(--launcher-card-selected-bg)] text-[var(--ring)]",
              statusTone === "info" && "bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-fg)]",
              statusTone === "warning" && "bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)]",
            )}
          >
            {(statusLabel === "authorizing" || statusLabel === "refreshing") && (
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
            )}
            {statusLabel}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="spotify-content flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-5 scrollbar-hidden-until-hover">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Connection Section */}
          <section
            className="spotify-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "0ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                  <Radio className="size-3 text-muted-foreground" />
                </div>
                <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Connection
                </span>
              </div>

              {isConnected ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-hover-bg)] px-3 py-1.5 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
                >
                  <Unplug className="size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isAuthorizing || !clientId.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-selected-bg)] px-3 py-1.5 text-launcher-sm font-medium text-[var(--ring)] ring-1 ring-[var(--launcher-card-selected-border)] transition-all hover:bg-[var(--command-item-selected-bg)] disabled:opacity-50"
                >
                  {isAuthorizing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Music className="size-3.5" />
                  )}
                  Connect Spotify
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <Input
                ref={clientIdInputRef}
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value);
                  setStoredSpotifyClientId(event.target.value);
                }}
                placeholder="Spotify Client ID"
                className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 text-launcher-md text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all focus:outline-none focus:ring-[var(--ring)]"
              />
              <p className="text-launcher-xs text-muted-foreground">
                Create a Spotify app and add{" "}
                <code className="rounded bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 font-mono text-launcher-2xs text-muted-foreground">
                  beam://oauth
                </code>{" "}
                as redirect URI.
              </p>
            </div>

            {user && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 py-2.5 ring-1 ring-[var(--launcher-card-selected-border)]">
                <div className="flex size-8 items-center justify-center rounded-full bg-[var(--launcher-chip-bg)] text-[var(--ring)]">
                  <Music className="size-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-launcher-sm font-medium text-muted-foreground">
                    {user.display_name || user.id}
                  </span>
                  {user.email && (
                    <span className="text-launcher-xs text-muted-foreground">{user.email}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Now Playing Section */}
          <section
            className="spotify-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "50ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                  <Disc3 className="size-3 text-muted-foreground" />
                </div>
                <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Now Playing
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void refreshPlayback();
                    void refreshUserProfile();
                  }}
                  disabled={!isConnected || isLoadingPlayback}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-launcher-xs font-medium text-muted-foreground transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3", isLoadingPlayback && "animate-spin")} />
                  Refresh
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void openUrl("https://open.spotify.com/")}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-launcher-xs font-medium text-muted-foreground transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
                >
                  <ExternalLink className="size-3" />
                  Web Player
                </Button>
              </div>
            </div>

            {/* Album art and track info */}
            <div className="flex items-center gap-4 rounded-xl bg-[var(--launcher-card-bg)] p-3 ring-1 ring-[var(--launcher-card-border)]">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
                {nowPlayingImage ? (
                  <img
                    src={nowPlayingImage}
                    alt={nowPlaying?.name ?? "album art"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Disc3 className="size-6" />
                  </div>
                )}
                {playback?.is_playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--command-item-selected-bg)]">
                    <div className="flex items-end gap-0.5">
                      <span
                        className="w-0.5 animate-pulse bg-[var(--ring)]"
                        style={{ height: "8px", animationDelay: "0ms" }}
                      />
                      <span
                        className="w-0.5 animate-pulse bg-[var(--ring)]"
                        style={{ height: "12px", animationDelay: "150ms" }}
                      />
                      <span
                        className="w-0.5 animate-pulse bg-[var(--ring)]"
                        style={{ height: "6px", animationDelay: "300ms" }}
                      />
                      <span
                        className="w-0.5 animate-pulse bg-[var(--ring)]"
                        style={{ height: "10px", animationDelay: "450ms" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-launcher-lg font-medium tracking-[-0.01em] text-foreground">
                  {nowPlaying?.name ||
                    (isConnected ? "Nothing playing" : "Connect Spotify to view playback")}
                </p>
                <p className="truncate text-launcher-sm text-muted-foreground">
                  {nowPlayingArtists}
                </p>
                <p className="mt-1 text-launcher-xs text-muted-foreground">
                  {nowPlaying ? formatDuration(nowPlaying.duration_ms) : "--:--"}
                </p>
              </div>
            </div>

            {/* Device selector */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="size-3 text-muted-foreground" />
                <span className="text-launcher-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Playback Device
                </span>
              </div>
              <Select
                value={resolvedSelectedDeviceId}
                onValueChange={(value: string | null) => {
                  if (!value) return;
                  setSelectedDeviceId(value);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-0 bg-[var(--launcher-card-hover-bg)] text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-chip-bg)] focus:ring-[var(--ring)]">
                  <div className="flex items-center gap-2">
                    <Radio className="size-3.5 text-muted-foreground" />
                    <SelectValue>
                      {selectedDevice?.name || playback?.device?.name || "Select device"}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--launcher-card-border)] bg-[var(--popover)] p-1 shadow-xl">
                  {devices.map((device) => (
                    <SelectItem
                      key={device.id}
                      value={device.id}
                      className="rounded-lg text-launcher-sm text-muted-foreground focus:bg-[var(--launcher-chip-bg)] focus:text-foreground"
                    >
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingDevices ? (
                <p className="text-launcher-xs text-muted-foreground">Loading devices…</p>
              ) : devices.length === 0 ? (
                <p className="text-launcher-xs text-muted-foreground">
                  No active devices. Open Spotify on a device first.
                </p>
              ) : null}
            </div>

            {/* Playback controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void runPlaybackAction("previous")}
                disabled={!isConnected || isActionPending}
                className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-selected-bg)] hover:text-foreground disabled:opacity-40"
              >
                <SkipBack className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => void runPlaybackAction(playback?.is_playing ? "pause" : "play")}
                disabled={!isConnected || isActionPending}
                className="flex size-12 items-center justify-center rounded-2xl bg-[var(--launcher-card-selected-bg)] text-[var(--ring)] ring-1 ring-[var(--launcher-card-selected-border)] transition-all hover:bg-[var(--command-item-selected-bg)] hover:scale-105 disabled:opacity-40"
              >
                {playback?.is_playing ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5 ml-0.5" />
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void runPlaybackAction("next")}
                disabled={!isConnected || isActionPending}
                className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-selected-bg)] hover:text-foreground disabled:opacity-40"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>
          </section>

          {/* Search Section */}
          <section
            className="spotify-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "100ms" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                <Search className="size-3 text-muted-foreground" />
              </div>
              <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Search Tracks
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 ring-1 ring-[var(--launcher-card-border)] transition-all focus-within:ring-[var(--ring)]">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void runSearch();
                    }
                  }}
                  className="h-full w-full border-none bg-transparent text-launcher-md text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Search tracks, artists, albums..."
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void runSearch()}
                disabled={!isConnected || isSearching || !searchInput.trim()}
                className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-selected-bg)] text-[var(--ring)] ring-1 ring-[var(--launcher-card-selected-border)] transition-all hover:bg-[var(--command-item-selected-bg)] disabled:opacity-40"
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            <div className="mt-4 space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-launcher-sm text-muted-foreground">
                  {isConnected
                    ? "Search for a song to see results."
                    : "Connect Spotify first, then search tracks."}
                </p>
              ) : (
                searchResults.map((track, idx) => (
                  <Button
                    key={track.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      track.external_urls?.spotify && void openUrl(track.external_urls.spotify)
                    }
                    className="spotify-result group flex w-full items-center gap-3 rounded-xl bg-[var(--launcher-card-bg)] p-2.5 text-left ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-selected-border)]"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[var(--ring)] opacity-0 transition-opacity group-hover:opacity-100" />

                    {/* Track thumbnail */}
                    <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--launcher-card-hover-bg)]">
                      {track.album?.images?.[0]?.url ? (
                        <img
                          src={track.album.images[0].url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Disc3 className="size-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-launcher-md font-medium text-muted-foreground">
                        {track.name}
                      </p>
                      <p className="truncate text-launcher-xs text-muted-foreground">
                        {toArtists(track)}
                      </p>
                    </div>

                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Button>
                ))
              )}
            </div>
          </section>

          {/* Error display */}
          {mergedError && (
            <div className="rounded-xl border border-[var(--destructive)] bg-[var(--command-item-selected-bg)] px-4 py-3 text-launcher-sm text-[var(--destructive)]">
              {mergedError}
            </div>
          )}
        </div>
      </div>

      <ModuleFooter
        className="spotify-footer h-11 border-[var(--footer-border)] px-5"
        leftSlot={
          <div className="flex items-center gap-2 text-launcher-xs text-muted-foreground">
            <div className="flex size-5 items-center justify-center rounded-md bg-[var(--launcher-chip-bg)]">
              <Music className="size-3 text-[var(--ring)]" />
            </div>
            <span className="font-medium">Spotify</span>
            {isConnected && user && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{user.display_name || user.id}</span>
              </>
            )}
          </div>
        }
        shortcuts={[
          { keys: ["Enter"], label: "Search" },
          { keys: ["Esc"], label: "Back" },
        ]}
      />
    </div>
  );
}
