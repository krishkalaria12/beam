import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { useRef, useState } from "react";

import { parseOauthDeepLink } from "@/modules/extensions/extension-manager/deep-link";

import {
  githubCreateAuthSession,
  githubExchangeCodeForTokens,
  githubGetCurrentUser,
  githubRefreshAccessToken,
} from "../api/github";
import {
  getGithubStoredTokens,
  removeGithubStoredTokens,
  setGithubStoredTokens,
} from "../api/oauth-tokens";
import {
  clearPendingGithubAuthSession,
  getGithubDefaultRedirectUri,
  getStoredGithubClientId,
  loadPendingGithubAuthSession,
  savePendingGithubAuthSession,
  setStoredGithubClientId,
} from "../lib/oauth-session";
import { isTokenExpired, toStoredTokens } from "../lib/token";
import type { GithubStoredTokenSet, GithubUserProfile } from "../types";
import { useMountEffect } from "@/hooks/use-mount-effect";

async function openAuthUrl(url: string) {
  if (isTauri()) {
    await openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function useGithubAuth() {
  const [clientId, setClientId] = useState(() => getStoredGithubClientId());
  const [tokens, setTokens] = useState<GithubStoredTokenSet | null>(null);
  const [user, setUser] = useState<GithubUserProfile | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokensRef = useRef<GithubStoredTokenSet | null>(tokens);
  const clientIdRef = useRef(clientId);
  tokensRef.current = tokens;
  clientIdRef.current = clientId;

  const isConnected = !!tokens?.accessToken;

  async function ensureAccessToken() {
    const current = tokensRef.current ?? (await getGithubStoredTokens());

    if (!current) {
      setTokens(null);
      tokensRef.current = null;
      return null;
    }

    if (!isTokenExpired(current)) {
      if (!tokensRef.current) {
        setTokens(current);
        tokensRef.current = current;
      }
      return current.accessToken;
    }

    if (!current.refreshToken) {
      return current.accessToken;
    }

    const effectiveClientId = clientIdRef.current.trim() || getStoredGithubClientId();
    if (!effectiveClientId) {
      return current.accessToken;
    }

    try {
      setIsRefreshingToken(true);
      const refreshed = await githubRefreshAccessToken({
        clientId: effectiveClientId,
        refreshToken: current.refreshToken,
      });
      const merged = toStoredTokens(refreshed, current);
      await setGithubStoredTokens(merged);
      setTokens(merged);
      tokensRef.current = merged;
      return merged.accessToken;
    } catch (refreshError) {
      await removeGithubStoredTokens();
      setTokens(null);
      tokensRef.current = null;
      setUser(null);
      setError(
        refreshError instanceof Error ? refreshError.message : "Failed to refresh GitHub token.",
      );
      return null;
    } finally {
      setIsRefreshingToken(false);
    }
  }

  async function refreshUserProfile() {
    const accessToken = await ensureAccessToken();
    if (!accessToken) {
      setUser(null);
      return null;
    }

    const profile = await githubGetCurrentUser(accessToken);
    setUser(profile);
    return profile;
  }

  async function disconnect() {
    await removeGithubStoredTokens();
    clearPendingGithubAuthSession();
    setTokens(null);
    tokensRef.current = null;
    setUser(null);
    setError(null);
    setIsAuthorizing(false);
  }

  async function connect() {
    const normalizedClientId = clientIdRef.current.trim();
    if (!normalizedClientId) {
      setError("GitHub Client ID is required.");
      return;
    }

    setError(null);
    setStoredGithubClientId(normalizedClientId);

    try {
      setIsAuthorizing(true);

      const redirectUri = getGithubDefaultRedirectUri();
      const session = await githubCreateAuthSession({
        clientId: normalizedClientId,
        redirectUri,
      });

      savePendingGithubAuthSession({
        state: session.state,
        codeVerifier: session.codeVerifier,
        clientId: normalizedClientId,
        redirectUri,
        createdAt: new Date().toISOString(),
      });

      await openAuthUrl(session.authorizeUrl);
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : "Failed to start GitHub OAuth flow.",
      );
      setIsAuthorizing(false);
    }
  }

  useMountEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const stored = await getGithubStoredTokens();
        if (!mounted) {
          return;
        }

        if (!stored) {
          setTokens(null);
          tokensRef.current = null;
          return;
        }

        setTokens(stored);
        tokensRef.current = stored;

        const accessToken = await ensureAccessToken();
        if (!accessToken) {
          return;
        }

        const profile = await githubGetCurrentUser(accessToken);
        if (!mounted) {
          return;
        }

        setUser(profile);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load GitHub session.");
      }
    })();

    return () => {
      mounted = false;
    };
  });

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;

    void listen<string>("deep-link", (event) => {
      const parsed = parseOauthDeepLink(event.payload);
      if (!parsed.handled) {
        return;
      }

      if (parsed.kind === "error") {
        const pending = loadPendingGithubAuthSession();
        if (!pending) {
          return;
        }

        if (parsed.state && pending.state !== parsed.state) {
          return;
        }

        clearPendingGithubAuthSession();
        setError(parsed.error || "GitHub authorization failed.");
        setIsAuthorizing(false);
        return;
      }

      const pending = loadPendingGithubAuthSession();
      if (!pending || pending.state !== parsed.state) {
        return;
      }

      void (async () => {
        try {
          setError(null);

          const tokenResponse = await githubExchangeCodeForTokens({
            clientId: pending.clientId,
            redirectUri: pending.redirectUri,
            code: parsed.code,
            codeVerifier: pending.codeVerifier,
          });

          const nextTokens = toStoredTokens(tokenResponse, null);
          await setGithubStoredTokens(nextTokens);
          setTokens(nextTokens);
          tokensRef.current = nextTokens;
          setStoredGithubClientId(pending.clientId);
          clearPendingGithubAuthSession();

          const profile = await githubGetCurrentUser(nextTokens.accessToken);
          setUser(profile);
        } catch (exchangeError) {
          setError(
            exchangeError instanceof Error
              ? exchangeError.message
              : "Failed to complete GitHub OAuth.",
          );
        } finally {
          setIsAuthorizing(false);
        }
      })();
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
  });

  let statusLabel = "disconnected";
  if (isAuthorizing) {
    statusLabel = "authorizing";
  } else if (isRefreshingToken) {
    statusLabel = "refreshing";
  } else if (isConnected) {
    statusLabel = "connected";
  }

  return {
    clientId,
    setClientId,
    isConnected,
    isAuthorizing,
    isRefreshingToken,
    statusLabel,
    user,
    error,
    setError,
    connect,
    disconnect,
    ensureAccessToken,
    refreshUserProfile,
  };
}
