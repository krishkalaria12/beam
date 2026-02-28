import { isTauri } from "@tauri-apps/api/core";

export function assertDesktopRuntime(): void {
  if (!isTauri()) {
    throw new Error("Window switcher is only available in desktop runtime.");
  }
}

export function getInvokeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}
