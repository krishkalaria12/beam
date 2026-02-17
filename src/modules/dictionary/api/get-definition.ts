import { invoke } from "@tauri-apps/api/core";
import type { DictionaryResponse } from "../types";

export async function getDefinition(
  word: string,
  language?: string,
): Promise<DictionaryResponse | null> {
  try {
    const result = await invoke<DictionaryResponse | null>("get_definition", {
      word,
      language,
    });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch definition");
  }
}
