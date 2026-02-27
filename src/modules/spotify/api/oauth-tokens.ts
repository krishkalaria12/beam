import { invoke } from "@tauri-apps/api/core";

import type { OAuthStoredTokenSet } from "../types";
import { assertSpotifyDesktopRuntime, getInvokeErrorMessage } from "./runtime";

const SPOTIFY_PROVIDER_ID = "spotify";

export async function getSpotifyStoredTokens(): Promise<OAuthStoredTokenSet | null> {
  assertSpotifyDesktopRuntime();

  try {
    const value = await invoke<OAuthStoredTokenSet | null>("oauth_get_tokens", {
      providerId: SPOTIFY_PROVIDER_ID,
    });

    return value ?? null;
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to read Spotify tokens."));
  }
}

export async function setSpotifyStoredTokens(tokens: OAuthStoredTokenSet): Promise<void> {
  assertSpotifyDesktopRuntime();

  try {
    await invoke("oauth_set_tokens", {
      providerId: SPOTIFY_PROVIDER_ID,
      tokens,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to save Spotify tokens."));
  }
}

export async function removeSpotifyStoredTokens(): Promise<void> {
  assertSpotifyDesktopRuntime();

  try {
    await invoke("oauth_remove_tokens", {
      providerId: SPOTIFY_PROVIDER_ID,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to remove Spotify tokens."));
  }
}
