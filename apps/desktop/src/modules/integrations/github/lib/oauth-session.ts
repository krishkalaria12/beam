import type { GithubPendingAuthSession } from "../types";

const PENDING_SESSION_STORAGE_KEY = "beam-github-pending-auth";
const CLIENT_ID_STORAGE_KEY = "beam-github-client-id";
const DEFAULT_REDIRECT_URI = "beam://oauth";

export function getGithubDefaultRedirectUri() {
  return DEFAULT_REDIRECT_URI;
}

export function getStoredGithubClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() ?? "";
}

export function setStoredGithubClientId(clientId: string) {
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

export function savePendingGithubAuthSession(session: GithubPendingAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PENDING_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadPendingGithubAuthSession(): GithubPendingAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = localStorage.getItem(PENDING_SESSION_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<GithubPendingAuthSession>;
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

export function clearPendingGithubAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(PENDING_SESSION_STORAGE_KEY);
}
