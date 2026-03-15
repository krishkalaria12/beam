import type { GithubStoredTokenSet, GithubTokenResponse } from "../types";

const REFRESH_BUFFER_MS = 60_000;

export function toStoredTokens(
  tokenResponse: GithubTokenResponse,
  previous?: GithubStoredTokenSet | null,
): GithubStoredTokenSet {
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? previous?.refreshToken,
    expiresIn: tokenResponse.expires_in ?? previous?.expiresIn,
    scope: tokenResponse.scope ?? previous?.scope,
    idToken: previous?.idToken,
    updatedAt: new Date().toISOString(),
  };
}

export function getTokenExpiryTimestamp(tokens: GithubStoredTokenSet): number | null {
  if (!tokens.updatedAt || !tokens.expiresIn || tokens.expiresIn <= 0) {
    return null;
  }

  const updatedAtMs = Date.parse(tokens.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return null;
  }

  return updatedAtMs + tokens.expiresIn * 1000;
}

export function isTokenExpired(tokens: GithubStoredTokenSet): boolean {
  const expiryTs = getTokenExpiryTimestamp(tokens);
  if (expiryTs === null) {
    return false;
  }

  return Date.now() + REFRESH_BUFFER_MS >= expiryTs;
}
