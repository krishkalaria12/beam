export interface SpotifyAuthSessionRequest {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  showDialog?: boolean;
}

export interface SpotifyAuthSessionResponse {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyPlaybackActionRequest {
  accessToken: string;
  deviceId?: string;
}

export interface SpotifySearchRequest {
  accessToken: string;
  query: string;
  types?: string[];
  market?: string;
  limit?: number;
  offset?: number;
  includeExternal?: string;
}

export interface OAuthStoredTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  idToken?: string;
  updatedAt: string;
}

export interface SpotifyPendingAuthSession {
  state: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  createdAt: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name?: string;
  email?: string;
  country?: string;
  product?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbumImage {
  url: string;
  width?: number;
  height?: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  duration_ms: number;
  external_urls?: {
    spotify?: string;
  };
  album?: {
    images?: SpotifyAlbumImage[];
    name?: string;
  };
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active?: boolean;
  volume_percent?: number;
}

export interface SpotifyPlayback {
  is_playing: boolean;
  progress_ms?: number;
  item?: SpotifyTrack | null;
  device?: SpotifyDevice | null;
}

export interface SpotifySearchTracksResult {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

export interface SpotifyDevicesResponse {
  devices?: SpotifyDevice[];
}
