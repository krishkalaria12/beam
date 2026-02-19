import { invoke } from "@tauri-apps/api/core";

import type { TranslateTextRequest, TranslateTextResponse } from "../types";

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

export async function translateText(
  request: TranslateTextRequest,
): Promise<TranslateTextResponse> {
  try {
    return await invoke<TranslateTextResponse>("translate_text", { request });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to translate text"));
  }
}
