import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";

const clipboardHistoryEntrySchema = z.object({
  value: z.string(),
  copied_at: z.string(),
  content_type: z.enum(ClipboardContentType),
  character_count: z.number(),
  word_count: z.number(),
});

const clipboardHistorySchema = z.array(clipboardHistoryEntrySchema);

export async function getClipboardHistory(): Promise<ClipboardHistoryEntry[]> {
  if (!isTauri()) {
    return [];
  }

  const clipboardHistory = await invoke<unknown>("get_clipboard_history_entries");
  const parsedClipboardHistory = clipboardHistorySchema.safeParse(clipboardHistory);

  if (!parsedClipboardHistory.success) {
    console.error("Failed to parse clipboard history:", parsedClipboardHistory.error);
    throw new Error("invalid clipboard history response from backend");
  }

  return parsedClipboardHistory.data;
}
