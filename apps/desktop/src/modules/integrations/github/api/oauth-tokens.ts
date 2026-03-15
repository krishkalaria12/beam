import { invoke } from "@tauri-apps/api/core";

import type { GithubStoredTokenSet } from "../types";
import { assertGithubDesktopRuntime, getInvokeErrorMessage } from "./runtime";

const GITHUB_PROVIDER_ID = "github";

export async function getGithubStoredTokens(): Promise<GithubStoredTokenSet | null> {
  assertGithubDesktopRuntime();

  try {
    const value = await invoke<GithubStoredTokenSet | null>("oauth_get_tokens", {
      providerId: GITHUB_PROVIDER_ID,
    });
    return value ?? null;
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to read GitHub tokens."));
  }
}

export async function setGithubStoredTokens(tokens: GithubStoredTokenSet): Promise<void> {
  assertGithubDesktopRuntime();

  try {
    await invoke("oauth_set_tokens", {
      providerId: GITHUB_PROVIDER_ID,
      tokens,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to save GitHub tokens."));
  }
}

export async function removeGithubStoredTokens(): Promise<void> {
  assertGithubDesktopRuntime();

  try {
    await invoke("oauth_remove_tokens", {
      providerId: GITHUB_PROVIDER_ID,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to remove GitHub tokens."));
  }
}
