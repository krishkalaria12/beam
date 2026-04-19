import { useCallback, useMemo, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import type { EmojiData } from "../types";

const RECENTLY_USED_STORAGE_KEY = "emoji-recently-used";
const RECENTLY_USED_LIMIT = 16;

let recentEmojiCache: string[] | null = null;
let pendingRecentEmojiWrite: number | null = null;

function readRecentlyUsedFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(RECENTLY_USED_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function getRecentEmojiCache(): string[] {
  if (recentEmojiCache !== null) {
    return recentEmojiCache;
  }

  recentEmojiCache = readRecentlyUsedFromStorage();
  return recentEmojiCache;
}

function flushRecentlyUsed() {
  if (typeof window === "undefined") {
    return;
  }

  if (pendingRecentEmojiWrite !== null) {
    window.clearTimeout(pendingRecentEmojiWrite);
    pendingRecentEmojiWrite = null;
  }

  if (recentEmojiCache === null) {
    return;
  }

  try {
    localStorage.setItem(RECENTLY_USED_STORAGE_KEY, JSON.stringify(recentEmojiCache));
  } catch {
    // Ignore localStorage errors
  }
}

function scheduleRecentlyUsedFlush() {
  if (typeof window === "undefined") {
    return;
  }

  if (pendingRecentEmojiWrite !== null) {
    window.clearTimeout(pendingRecentEmojiWrite);
  }

  pendingRecentEmojiWrite = window.setTimeout(() => {
    flushRecentlyUsed();
  }, 120);
}

export function useRecentEmojis(isOpen: boolean) {
  const [recentRefreshToken, setRecentRefreshToken] = useState(0);
  const recentEmojis = useMemo(
    () => (isOpen ? getRecentlyUsed() : []),
    [isOpen, recentRefreshToken],
  );

  useMountEffect(() => {
    const handleFlush = () => {
      flushRecentlyUsed();
    };

    window.addEventListener("pagehide", handleFlush);
    window.addEventListener("beforeunload", handleFlush);

    return () => {
      handleFlush();
      window.removeEventListener("pagehide", handleFlush);
      window.removeEventListener("beforeunload", handleFlush);
    };
  });

  const saveEmoji = useCallback((emoji: string) => {
    saveRecentlyUsed(emoji);
    setRecentRefreshToken((previous) => previous + 1);
  }, []);

  return { recentEmojis, saveEmoji };
}

function useFilteredEmojis(emojis: EmojiData[], searchValue: string, selectedCategory: string) {
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

function getRecentlyUsed(): string[] {
  return [...getRecentEmojiCache()];
}

function saveRecentlyUsed(emoji: string) {
  const recent = getRecentEmojiCache();
  recentEmojiCache = [emoji, ...recent.filter((entry) => entry !== emoji)].slice(
    0,
    RECENTLY_USED_LIMIT,
  );
  scheduleRecentlyUsedFlush();
}

export async function copyEmojiToClipboard(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("clipboard write is unavailable");
  }
  await navigator.clipboard.writeText(value);
}
