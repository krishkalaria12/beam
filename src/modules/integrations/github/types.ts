export interface GithubAuthSessionRequest {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  allowSignup?: boolean;
}

export interface GithubAuthSessionResponse {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

export interface GithubStoredTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  idToken?: string;
  updatedAt: string;
}

export interface GithubPendingAuthSession {
  state: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  createdAt: string;
}

export interface GithubUserProfile {
  login: string;
  id: number;
  avatar_url?: string;
  html_url?: string;
  name?: string;
  email?: string;
}

export interface GithubIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  updated_at?: string;
  repository_url?: string;
  pull_request?: {
    url?: string;
    html_url?: string;
  };
  user?: {
    login?: string;
  };
}

export interface GithubSearchIssuesResponse {
  total_count?: number;
  items?: GithubIssueItem[];
}
