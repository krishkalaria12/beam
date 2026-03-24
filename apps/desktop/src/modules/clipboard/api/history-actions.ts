import { invoke, isTauri } from "@tauri-apps/api/core";

import type { ClipboardHistoryEntry } from "@/modules/clipboard/types";

export const pinnedClipboardEntriesQueryKey = ["clipboard", "pinned-entries"] as const;

export function buildClipboardPinnedEntryId(input: { copiedAt: string; value: string }) {
  return `${input.copiedAt.trim()}::${input.value}`;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export async function getPinnedClipboardEntryIds(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_pinned_clipboard_entry_ids");
  return normalizeStringList(response);
}

export async function setClipboardEntryPinned(
  entry: Pick<ClipboardHistoryEntry, "copied_at" | "value">,
  pinned: boolean,
): Promise<string[]> {
  const response = await invoke<unknown>("set_clipboard_entry_pinned", {
    copiedAt: entry.copied_at,
    value: entry.value,
    pinned,
  });

  return normalizeStringList(response);
}

export async function deleteClipboardHistoryEntry(
  entry: Pick<ClipboardHistoryEntry, "copied_at" | "value">,
) {
  await invoke("delete_clipboard_history_entry", {
    copiedAt: entry.copied_at,
    value: entry.value,
  });
}

export async function clearClipboardHistory() {
  await invoke("clear_clipboard_history");
}

export async function pasteClipboardHistoryEntry(entry: ClipboardHistoryEntry) {
  await invoke("clipboard_paste", {
    content: {
      text: entry.content_type === "image" ? undefined : entry.value,
      html: undefined,
      file: undefined,
    },
  });
}
