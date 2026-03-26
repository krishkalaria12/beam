import { useCommandState } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { EMOJI_DATA } from "@/generated/emoji-data";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { usePinnedEmojis } from "@/modules/emoji/hooks/use-pinned-emojis";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";
import {
  clearEmojiActionsState,
  syncEmojiActionsState,
  toManagedEmojiItem,
} from "@/modules/emoji/hooks/use-emoji-action-items";
import {
  useManagedItemPreferencesStore,
  useManagedItemRankedList,
} from "@/modules/launcher/managed-items";

import { copyEmojiToClipboard, useRecentEmojis } from "../hooks/useEmoji";
import type { EmojiData } from "../types";
import { EmojiPicker } from "./EmojiPicker";

const EMOJI_KEYWORDS = [
  "emoji",
  "emoji picker",
  "emoticon",
  "smiley",
  "reaction",
  "kaomoji",
  "symbols",
] as const;

const EMOJI_BY_VALUE = new Map(EMOJI_DATA.map((emoji) => [emoji.emoji, emoji]));

interface EmojiCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

export default function EmojiCommandGroup({ isOpen, onOpen, onBack }: EmojiCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiData | null>(null);
  const copyErrorTimerRef = useRef<number | null>(null);
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);
  const emojis = EMOJI_DATA;

  const { recentEmojis, saveEmoji } = useRecentEmojis(isOpen);
  const { data: pinnedHexcodes = [] } = usePinnedEmojis();
  const pinnedHexcodeSet = useMemo(
    () => new Set(pinnedHexcodes.map((hexcode) => hexcode.toUpperCase())),
    [pinnedHexcodes],
  );

  useMountEffect(() => clearEmojiActionsState);

  const visibleEmojiPool = useMemo(() => {
    let filtered = emojis;

    if (selectedCategory !== "all") {
      const groupNum = Number.parseInt(selectedCategory, 10);
      filtered = filtered.filter((emoji) => emoji.group === groupNum);
    }

    if (selectedCategory === "all" && !searchValue) {
      filtered = filtered.slice(26);
    }

    return filtered;
  }, [emojis, searchValue, selectedCategory]);
  const filteredEmojis = useManagedItemRankedList({
    items: visibleEmojiPool,
    query: searchValue,
    getManagedItem: toManagedEmojiItem,
    getSearchableText: (emoji) => emoji.searchText,
    compareFallback: (left, right) => left.order - right.order,
  });

  const recentEmojiObjects = useMemo(() => {
    return recentEmojis
      .map((emoji) => EMOJI_BY_VALUE.get(emoji))
      .filter((emoji): emoji is EmojiData => emoji !== undefined);
  }, [recentEmojis]);
  const pinnedEmojiPool = useMemo(
    () => emojis.filter((emoji) => pinnedHexcodeSet.has(emoji.hexcode)).slice(0, 16),
    [emojis, pinnedHexcodeSet],
  );
  const pinnedEmojiObjects = useManagedItemRankedList({
    items: pinnedEmojiPool,
    query: "",
    getManagedItem: toManagedEmojiItem,
    getSearchableText: (emoji) => emoji.searchText,
    compareFallback: (left, right) => left.order - right.order,
  });
  const orderedGridEmojis = useMemo(() => {
    if (searchValue) {
      const pinnedSearchEmojis = filteredEmojis.filter((emoji) => pinnedHexcodeSet.has(emoji.hexcode));
      const unpinnedSearchEmojis = filteredEmojis.filter((emoji) => !pinnedHexcodeSet.has(emoji.hexcode));

      return [...pinnedSearchEmojis, ...unpinnedSearchEmojis];
    }

    return filteredEmojis.filter((emoji) => !pinnedHexcodeSet.has(emoji.hexcode));
  }, [filteredEmojis, pinnedHexcodeSet, searchValue]);

  const visibleSelectedEmoji = searchValue
    ? orderedGridEmojis.some((emoji) => emoji.hexcode === selectedEmoji?.hexcode)
      ? selectedEmoji
      : null
    : selectedEmoji &&
        (orderedGridEmojis.some((emoji) => emoji.hexcode === selectedEmoji.hexcode) ||
          pinnedEmojiObjects.some((emoji) => emoji.hexcode === selectedEmoji.hexcode) ||
          recentEmojiObjects.some((emoji) => emoji.hexcode === selectedEmoji.hexcode))
      ? selectedEmoji
      : null;

  const resolvedSelectedEmoji = searchValue
    ? (visibleSelectedEmoji ?? orderedGridEmojis[0] ?? null)
    : (visibleSelectedEmoji ??
      pinnedEmojiObjects[0] ??
      recentEmojiObjects[0] ??
      orderedGridEmojis[0] ??
      null);

  const handleEmojiClick = useCallback(
    async (emojiData: EmojiData) => {
      try {
        setSelectedEmoji(emojiData);
        await copyEmojiToClipboard(emojiData.emoji);
        recordUsage(toManagedEmojiItem(emojiData));
        saveEmoji(emojiData.emoji);
        if (copyErrorTimerRef.current !== null) {
          window.clearTimeout(copyErrorTimerRef.current);
        }
        setCopyError(null);
      } catch {
        setCopyError("Could not copy emoji");
        if (copyErrorTimerRef.current !== null) {
          window.clearTimeout(copyErrorTimerRef.current);
        }
        copyErrorTimerRef.current = window.setTimeout(() => {
          copyErrorTimerRef.current = null;
          setCopyError(null);
        }, 1500);
      }
    },
    [recordUsage, saveEmoji],
  );

  const handleCopySelected = useCallback(() => {
    if (!resolvedSelectedEmoji) {
      return;
    }

    return handleEmojiClick(resolvedSelectedEmoji);
  }, [handleEmojiClick, resolvedSelectedEmoji]);

  useEffect(() => {
    syncEmojiActionsState({
      selectedEmoji: resolvedSelectedEmoji,
      onCopySelected: handleCopySelected,
    });
  }, [handleCopySelected, resolvedSelectedEmoji]);

  if (!isOpen) {
    const shouldShowOpenEmoji = matchesCommandKeywords(query, EMOJI_KEYWORDS);

    if (!shouldShowOpenEmoji) {
      return null;
    }

    return (
      <CommandGroup>
        <OpenModuleCommandRow
          value="open emoji picker"
          onSelect={onOpen}
          icon={<CommandIcon icon="emoji" />}
          title="emoji picker"
        />
      </CommandGroup>
    );
  }
  return (
    <EmojiPicker
      emojis={orderedGridEmojis}
      pinnedEmojis={searchValue ? [] : pinnedEmojiObjects}
      recentEmojis={recentEmojiObjects}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      onEmojiClick={handleEmojiClick}
      onEmojiHover={setSelectedEmoji}
      onBack={onBack}
      showError={!!copyError}
    />
  );
}
