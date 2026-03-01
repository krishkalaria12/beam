import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { useCallback, useEffect, useMemo, useState } from "react";

import { parseOauthDeepLink } from "@/modules/extensions/sidecar/deep-link";

import {
  getSpotifyStoredTokens,
  removeSpotifyStoredTokens,
  setSpotifyStoredTokens,
} from "../api/oauth-tokens";
import {
  spotifyCreateAuthSession,
  spotifyExchangeCodeForTokens,
  spotifyGetCurrentUser,
  spotifyRefreshAccessToken,
} from "../api/spotify";
import {
  clearPendingSpotifyAuthSession,
  getSpotifyDefaultRedirectUri,
  getStoredSpotifyClientId,
  loadPendingSpotifyAuthSession,
  savePendingSpotifyAuthSession,
  setStoredSpotifyClientId,
} from "../lib/oauth-session";
import { isTokenExpired, toStoredTokens } from "../lib/token";
import type { OAuthStoredTokenSet, SpotifyUserProfile } from "../types";

async function openAuthUrl(url: string) {
  if (isTauri()) {
    await openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function useSpotifyAuth() {
  const [clientId, setClientId] = useState(() => getStoredSpotifyClientId());
  const [tokens, setTokens] = useState<OAuthStoredTokenSet | null>(null);
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!tokens?.accessToken;

  const ensureAccessToken = useCallback(async () => {
    const current = tokens ?? (await getSpotifyStoredTokens());

    if (!current) {
      setTokens(null);
      return null;
    }

    if (!isTokenExpired(current)) {
      if (!tokens) {
        setTokens(current);
      }
      return current.accessToken;
    }

    if (!current.refreshToken) {
      return current.accessToken;
    }

    const effectiveClientId = clientId.trim() || getStoredSpotifyClientId();
    if (!effectiveClientId) {
      return current.accessToken;
    }

    try {
      setIsRefreshingToken(true);
      const refreshed = await spotifyRefreshAccessToken({
        clientId: effectiveClientId,
        refreshToken: current.refreshToken,
      });
      const merged = toStoredTokens(refreshed, current);
      await setSpotifyStoredTokens(merged);
      setTokens(merged);
      return merged.accessToken;
    } catch (refreshError) {
      await removeSpotifyStoredTokens();
      setTokens(null);
      setUser(null);
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh Spotify token.");
      return null;
    } finally {
      setIsRefreshingToken(false);
    }
  }, [clientId, tokens]);

  const refreshUserProfile = useCallback(async () => {
    const accessToken = await ensureAccessToken();
    if (!accessToken) {
      setUser(null);
      return null;
    }

    const profile = await spotifyGetCurrentUser(accessToken);
    setUser(profile);
    return profile;
  }, [ensureAccessToken]);

  const disconnect = useCallback(async () => {
    await removeSpotifyStoredTokens();
    clearPendingSpotifyAuthSession();
    setTokens(null);
    setUser(null);
    setError(null);
    setIsAuthorizing(false);
  }, []);

  const connect = useCallback(async () => {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      setError("Spotify Client ID is required.");
      return;
    }

    setError(null);
    setStoredSpotifyClientId(normalizedClientId);

    try {
      setIsAuthorizing(true);

      const redirectUri = getSpotifyDefaultRedirectUri();
      const session = await spotifyCreateAuthSession({
        clientId: normalizedClientId,
        redirectUri,
        showDialog: true,
      });

      savePendingSpotifyAuthSession({
        state: session.state,
        codeVerifier: session.codeVerifier,
        clientId: normalizedClientId,
        redirectUri,
        createdAt: new Date().toISOString(),
      });

      await openAuthUrl(session.authorizeUrl);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Failed to start Spotify OAuth flow.");
      setIsAuthorizing(false);
    }
  }, [clientId]);

  const handleOauthSuccess = useCallback(async (state: string, code: string) => {
    const pending = loadPendingSpotifyAuthSession();
    if (!pending || pending.state !== state) {
      return;
    }

    setError(null);

    try {
      const tokenResponse = await spotifyExchangeCodeForTokens({
        clientId: pending.clientId,
        redirectUri: pending.redirectUri,
        code,
        codeVerifier: pending.codeVerifier,
      });

      const nextTokens = toStoredTokens(tokenResponse, null);
      await setSpotifyStoredTokens(nextTokens);
      setTokens(nextTokens);
      setStoredSpotifyClientId(pending.clientId);
      clearPendingSpotifyAuthSession();
      await refreshUserProfile();
    } catch (exchangeError) {
      setError(exchangeError instanceof Error ? exchangeError.message : "Failed to complete Spotify OAuth.");
    } finally {
      setIsAuthorizing(false);
    }
  }, [refreshUserProfile]);

  const handleOauthError = useCallback((state: string | undefined, message: string) => {
    const pending = loadPendingSpotifyAuthSession();
    if (!pending) {
      return;
    }

    if (state && pending.state !== state) {
      return;
    }

    clearPendingSpotifyAuthSession();
    setError(message || "Spotify authorization failed.");
    setIsAuthorizing(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const stored = await getSpotifyStoredTokens();
        if (!mounted) {
          return;
        }

        if (!stored) {
          setTokens(null);
          return;
        }

        setTokens(stored);
        await refreshUserProfile();
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load Spotify session.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshUserProfile]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;

    void listen<string>("deep-link", (event) => {
      const parsed = parseOauthDeepLink(event.payload);
      if (!parsed.handled) {
        return;
      }

      if (parsed.kind === "success") {
        void handleOauthSuccess(parsed.state, parsed.code);
        return;
      }

      handleOauthError(parsed.state, parsed.error);
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
  }, [handleOauthError, handleOauthSuccess]);

  const statusLabel = useMemo(() => {
    if (isAuthorizing) {
      return "authorizing";
    }

    if (isRefreshingToken) {
      return "refreshing";
    }

    return isConnected ? "connected" : "disconnected";
  }, [isAuthorizing, isConnected, isRefreshingToken]);

  return {
    clientId,
    setClientId,
    isConnected,
    isAuthorizing,
    isRefreshingToken,
    statusLabel,
    tokens,
    user,
    error,
    setError,
    connect,
    disconnect,
    ensureAccessToken,
    refreshUserProfile,
  };
}
