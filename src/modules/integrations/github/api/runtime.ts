import { isTauri } from "@tauri-apps/api/core";

export function assertGithubDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("GitHub integration requires desktop runtime.");
  }
}

export function getInvokeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return fallback;
}
