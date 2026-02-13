import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

const clipboardHistorySchema = z.array(z.string());

export async function getClipboardHistory() {
  if (!isTauri()) {
    return [];
  }

  const clipboardHistory = await invoke<unknown>("get_clipboard_history");
  const parsedClipboardHistory = clipboardHistorySchema.safeParse(clipboardHistory);

  if (!parsedClipboardHistory.success) {
    throw new Error("invalid clipboard history response from backend");
  }

  return parsedClipboardHistory.data;
}
