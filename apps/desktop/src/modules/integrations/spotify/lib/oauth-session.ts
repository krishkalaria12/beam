import type { SpotifyPendingAuthSession } from "../types";

const PENDING_SESSION_STORAGE_KEY = "beam-spotify-pending-auth";
const CLIENT_ID_STORAGE_KEY = "beam-spotify-client-id";
const DEFAULT_REDIRECT_URI = "beam://oauth";

export function getSpotifyDefaultRedirectUri() {
  return DEFAULT_REDIRECT_URI;
}

export function getStoredSpotifyClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() ?? "";
}

export function setStoredSpotifyClientId(clientId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = clientId.trim();
  if (!normalized) {
    localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    return;
  }

  localStorage.setItem(CLIENT_ID_STORAGE_KEY, normalized);
}

export function savePendingSpotifyAuthSession(session: SpotifyPendingAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PENDING_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadPendingSpotifyAuthSession(): SpotifyPendingAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = localStorage.getItem(PENDING_SESSION_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SpotifyPendingAuthSession>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.clientId !== "string" ||
      typeof parsed.redirectUri !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      clientId: parsed.clientId,
      redirectUri: parsed.redirectUri,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingSpotifyAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(PENDING_SESSION_STORAGE_KEY);
}
