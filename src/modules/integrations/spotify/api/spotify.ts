import { invoke } from "@tauri-apps/api/core";

import type {
  SpotifyAuthSessionRequest,
  SpotifyAuthSessionResponse,
  SpotifyDevicesResponse,
  SpotifyPlaybackActionRequest,
  SpotifySearchRequest,
  SpotifySearchTracksResult,
  SpotifyTokenResponse,
  SpotifyUserProfile,
} from "../types";
import { assertSpotifyDesktopRuntime, getInvokeErrorMessage } from "./runtime";

export async function spotifyCreateAuthSession(
  request: SpotifyAuthSessionRequest,
): Promise<SpotifyAuthSessionResponse> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifyAuthSessionResponse>("spotify_create_auth_session", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to create Spotify auth session."));
  }
}

export async function spotifyExchangeCodeForTokens(request: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<SpotifyTokenResponse> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifyTokenResponse>("spotify_exchange_code_for_tokens", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to exchange Spotify authorization code."));
  }
}

export async function spotifyRefreshAccessToken(request: {
  clientId: string;
  refreshToken: string;
}): Promise<SpotifyTokenResponse> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifyTokenResponse>("spotify_refresh_access_token", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to refresh Spotify access token."));
  }
}

export async function spotifyGetCurrentUser(accessToken: string): Promise<SpotifyUserProfile> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifyUserProfile>("spotify_get_current_user", { accessToken });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load Spotify profile."));
  }
}

export async function spotifyGetCurrentPlayback(accessToken: string) {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke("spotify_get_current_playback", { accessToken });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load Spotify playback."));
  }
}

export async function spotifyGetDevices(accessToken: string): Promise<SpotifyDevicesResponse> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifyDevicesResponse>("spotify_get_devices", { accessToken });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load Spotify devices."));
  }
}

export async function spotifyPlay(request: SpotifyPlaybackActionRequest): Promise<void> {
  assertSpotifyDesktopRuntime();
  try {
    await invoke("spotify_play", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to resume Spotify playback."));
  }
}

export async function spotifyPause(request: SpotifyPlaybackActionRequest): Promise<void> {
  assertSpotifyDesktopRuntime();
  try {
    await invoke("spotify_pause", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to pause Spotify playback."));
  }
}

export async function spotifyNextTrack(request: SpotifyPlaybackActionRequest): Promise<void> {
  assertSpotifyDesktopRuntime();
  try {
    await invoke("spotify_next_track", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to skip to next track."));
  }
}

export async function spotifyPreviousTrack(request: SpotifyPlaybackActionRequest): Promise<void> {
  assertSpotifyDesktopRuntime();
  try {
    await invoke("spotify_previous_track", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to skip to previous track."));
  }
}

export async function spotifySearch(
  request: SpotifySearchRequest,
): Promise<SpotifySearchTracksResult> {
  assertSpotifyDesktopRuntime();
  try {
    return await invoke<SpotifySearchTracksResult>("spotify_search", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to search Spotify."));
  }
}
