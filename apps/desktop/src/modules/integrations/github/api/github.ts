import { invoke } from "@tauri-apps/api/core";

import type {
  GithubAuthSessionRequest,
  GithubAuthSessionResponse,
  GithubIssueItem,
  GithubSearchIssuesResponse,
  GithubTokenResponse,
  GithubUserProfile,
} from "../types";
import { assertGithubDesktopRuntime, getInvokeErrorMessage } from "./runtime";

export async function githubCreateAuthSession(
  request: GithubAuthSessionRequest,
): Promise<GithubAuthSessionResponse> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubAuthSessionResponse>("github_create_auth_session", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to create GitHub auth session."));
  }
}

export async function githubExchangeCodeForTokens(request: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<GithubTokenResponse> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubTokenResponse>("github_exchange_code_for_tokens", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to exchange GitHub authorization code."));
  }
}

export async function githubRefreshAccessToken(request: {
  clientId: string;
  refreshToken: string;
}): Promise<GithubTokenResponse> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubTokenResponse>("github_refresh_access_token", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to refresh GitHub access token."));
  }
}

export async function githubGetCurrentUser(accessToken: string): Promise<GithubUserProfile> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubUserProfile>("github_get_current_user", { accessToken });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load GitHub profile."));
  }
}

export async function githubGetAssignedIssues(request: {
  accessToken: string;
  filter?: string;
  state?: string;
  sort?: string;
  direction?: string;
  perPage?: number;
  page?: number;
}): Promise<GithubIssueItem[]> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubIssueItem[]>("github_get_assigned_issues", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load assigned GitHub issues."));
  }
}

export async function githubSearchIssuesAndPullRequests(request: {
  accessToken: string;
  query: string;
  sort?: string;
  order?: string;
  perPage?: number;
  page?: number;
}): Promise<GithubSearchIssuesResponse> {
  assertGithubDesktopRuntime();
  try {
    return await invoke<GithubSearchIssuesResponse>("github_search_issues_and_pull_requests", {
      request,
    });
  } catch (error) {
    throw new Error(
      getInvokeErrorMessage(error, "Failed to search GitHub issues and pull requests."),
    );
  }
}
