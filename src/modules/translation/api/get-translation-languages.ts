import { invoke } from "@tauri-apps/api/core";

import type { TranslationLanguage } from "../types";

function getInvokeErrorMessage(error: unknown, fallback: string): string {
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

export async function getTranslationLanguages(): Promise<TranslationLanguage[]> {
  try {
    return await invoke<TranslationLanguage[]>("get_translation_languages");
  } catch (error) {
    throw new Error(
      getInvokeErrorMessage(error, "Failed to load translation languages"),
    );
  }
}
