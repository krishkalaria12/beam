import { githubRefreshAccessToken } from "@/modules/integrations/github/api/github";
import {
  getGithubStoredTokens,
  removeGithubStoredTokens,
  setGithubStoredTokens,
} from "@/modules/integrations/github/api/oauth-tokens";
import { getStoredGithubClientId } from "@/modules/integrations/github/lib/oauth-session";
import { isTokenExpired, toStoredTokens } from "@/modules/integrations/github/lib/token";
import type { GithubStoredTokenSet } from "@/modules/integrations/github/types";

export async function resolveGithubStoredTokens(
  currentTokens?: GithubStoredTokenSet | null,
  clientId = getStoredGithubClientId(),
): Promise<GithubStoredTokenSet | null> {
  const current = currentTokens ?? (await getGithubStoredTokens());
  if (!current) {
    return null;
  }

  if (!isTokenExpired(current)) {
    return current;
  }

  if (!current.refreshToken) {
    return current;
  }

  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) {
    return current;
  }

  try {
    const refreshed = await githubRefreshAccessToken({
      clientId: normalizedClientId,
      refreshToken: current.refreshToken,
    });
    const merged = toStoredTokens(refreshed, current);
    await setGithubStoredTokens(merged);
    return merged;
  } catch (error) {
    await removeGithubStoredTokens();
    throw error;
  }
}

export async function ensureGithubStoredAccessToken(
  currentTokens?: GithubStoredTokenSet | null,
  clientId?: string,
): Promise<string | null> {
  const tokens = await resolveGithubStoredTokens(currentTokens, clientId);
  return tokens?.accessToken ?? null;
}
