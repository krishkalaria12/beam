import { useCallback, useMemo, useState } from "react";
import type { EmojiData, EmojiDataItem } from "../types";
import { CATEGORY_ORDER } from "../types";

export function useRecentEmojis(isOpen: boolean) {
  const [recentRefreshToken, setRecentRefreshToken] = useState(0);
  const recentEmojis = useMemo(
    () => (isOpen ? getRecentlyUsed() : []),
    [isOpen, recentRefreshToken],
  );

  const saveEmoji = useCallback((emoji: string) => {
    saveRecentlyUsed(emoji);
    setRecentRefreshToken((previous) => previous + 1);
  }, []);

  return { recentEmojis, saveEmoji };
}

export function useFilteredEmojis(
  emojis: EmojiData[],
  searchValue: string,
  selectedCategory: string,
) {
  return useMemo(() => {
    let filtered = emojis;

    if (selectedCategory !== "all") {
      const groupNum = parseInt(selectedCategory, 10);
      filtered = filtered.filter((emoji) => emoji.group === groupNum);
    }

    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(
        (emoji) =>
          emoji.label.includes(searchLower) ||
          emoji.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
      );
    }

    // Skip first 26 emojis only when showing all categories AND not searching
    if (selectedCategory === "all" && !searchValue) {
      return filtered.slice(26);
    }

    return filtered;
  }, [emojis, searchValue, selectedCategory]);
}

export function getRecentlyUsed(): string[] {
  try {
    const stored = localStorage.getItem("emoji-recently-used");
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentlyUsed(emoji: string) {
  try {
    const recent = getRecentlyUsed();
    const updated = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 16);
    localStorage.setItem("emoji-recently-used", JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export async function copyEmojiToClipboard(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("clipboard write is unavailable");
  }
  await navigator.clipboard.writeText(value);
}

export function processEmojiData(data: EmojiDataItem[]): EmojiData[] {
  const processed = data
    .filter((item): item is EmojiDataItem & { emoji: string } => Boolean(item.emoji))
    .map((item) => ({
      emoji: item.emoji,
      label: item.label.toLowerCase(),
      tags: item.tags || [],
      group: item.group ?? 0,
      order: item.order ?? 0,
      hexcode: item.hexcode,
    }));

  // Sort by group order, then by order within group
  processed.sort((a, b) => {
    const groupA = CATEGORY_ORDER.indexOf(a.group);
    const groupB = CATEGORY_ORDER.indexOf(b.group);
    if (groupA !== groupB) return groupA - groupB;
    return a.order - b.order;
  });

  return processed;
}
