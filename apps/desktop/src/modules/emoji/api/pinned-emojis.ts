import { invoke, isTauri } from "@tauri-apps/api/core";

export const pinnedEmojiHexcodesQueryKey = ["emoji", "pinned-hexcodes"] as const;

function normalizeHexcodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const hexcode = entry.trim().toUpperCase();
    if (!hexcode || seen.has(hexcode)) {
      continue;
    }

    seen.add(hexcode);
    normalized.push(hexcode);
  }

  return normalized;
}

export async function getPinnedEmojiHexcodes(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_pinned_emoji_hexcodes");
  return normalizeHexcodes(response);
}

export async function setEmojiPinned(hexcode: string, pinned: boolean): Promise<string[]> {
  const response = await invoke<unknown>("set_emoji_pinned", {
    hexcode,
    pinned,
  });

  return normalizeHexcodes(response);
}
