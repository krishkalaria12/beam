import { useCommandState } from "cmdk";
import { useCallback, useMemo, useRef, useState } from "react";

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
  rankManagedItems,
  useManagedItemPreferencesStore,
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
const getEmojiSearchText = (emoji: EmojiData) => emoji.searchText;
const compareEmojiOrder = (left: EmojiData, right: EmojiData) => left.order - right.order;

function scheduleDeferredTask(task: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      task();
    }, { timeout: 300 });
    return;
  }

  globalThis.setTimeout(task, 0);
}

interface EmojiCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

interface EmojiActionsStateSyncProps {
  selectedEmoji: EmojiData | null;
  onCopySelected?: () => Promise<void> | void;
}

function EmojiActionsStateSync({ selectedEmoji, onCopySelected }: EmojiActionsStateSyncProps) {
  useMountEffect(() => {
    syncEmojiActionsState({
      selectedEmoji,
      onCopySelected,
    });
  });

  return null;
}

export default function EmojiCommandGroup({ isOpen, onOpen, onBack }: EmojiCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [activeEmoji, setActiveEmoji] = useState<EmojiData | null>(null);
  const copyErrorTimerRef = useRef<number | null>(null);
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const usageById = useManagedItemPreferencesStore((state) => state.usageById);
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);
  const emojis = EMOJI_DATA;

  const { recentEmojis, saveEmoji } = useRecentEmojis(isOpen);
  const { data: pinnedHexcodes = [] } = usePinnedEmojis();
  const pinnedHexcodeSet = useMemo(
    () => new Set(pinnedHexcodes.map((hexcode) => hexcode.toUpperCase())),
    [pinnedHexcodes],
  );

  useMountEffect(() => {
    clearEmojiActionsState();
    return clearEmojiActionsState;
  });

  const { orderedGridEmojis, pinnedEmojiObjects, recentEmojiObjects } = useMemo(() => {
    const categoryFilter =
      selectedCategory === "all" ? null : Number.parseInt(selectedCategory, 10);
    const visibleEmojiPool: EmojiData[] = [];
    const pinnedEmojiPool: EmojiData[] = [];

    for (const emoji of emojis) {
      if (pinnedHexcodeSet.has(emoji.hexcode)) {
        pinnedEmojiPool.push(emoji);
      }

      if (categoryFilter !== null && emoji.group !== categoryFilter) {
        continue;
      }

      visibleEmojiPool.push(emoji);
    }

    const baseVisiblePool =
      categoryFilter === null && !searchValue ? visibleEmojiPool.slice(26) : visibleEmojiPool;
    const rankedVisibleEmojis = rankManagedItems({
      items: baseVisiblePool,
      query: searchValue,
      favorites: favoriteIds,
      aliasesById,
      usageById,
      getManagedItem: toManagedEmojiItem,
      getSearchableText: getEmojiSearchText,
      compareFallback: compareEmojiOrder,
    });
    const rankedPinnedEmojis = rankManagedItems({
      items: pinnedEmojiPool,
      query: "",
      favorites: favoriteIds,
      aliasesById,
      usageById,
      getManagedItem: toManagedEmojiItem,
      getSearchableText: getEmojiSearchText,
      compareFallback: compareEmojiOrder,
    }).slice(0, 16);
    const pinnedSearchEmojis: EmojiData[] = [];
    const unpinnedSearchEmojis: EmojiData[] = [];

    for (const emoji of rankedVisibleEmojis) {
      if (pinnedHexcodeSet.has(emoji.hexcode)) {
        pinnedSearchEmojis.push(emoji);
      } else {
        unpinnedSearchEmojis.push(emoji);
      }
    }

    const recentEmojiObjects: EmojiData[] = [];
    for (const emojiValue of recentEmojis) {
      const emoji = EMOJI_BY_VALUE.get(emojiValue);
      if (emoji) {
        recentEmojiObjects.push(emoji);
      }
    }

    return {
      orderedGridEmojis: searchValue ? [...pinnedSearchEmojis, ...unpinnedSearchEmojis] : unpinnedSearchEmojis,
      pinnedEmojiObjects: rankedPinnedEmojis,
      recentEmojiObjects,
    };
  }, [aliasesById, emojis, favoriteIds, pinnedHexcodeSet, recentEmojis, searchValue, selectedCategory, usageById]);

  const visibleSelectedEmoji = searchValue
    ? orderedGridEmojis.some((emoji) => emoji.hexcode === activeEmoji?.hexcode)
      ? activeEmoji
      : null
    : activeEmoji &&
        (orderedGridEmojis.some((emoji) => emoji.hexcode === activeEmoji.hexcode) ||
          pinnedEmojiObjects.some((emoji) => emoji.hexcode === activeEmoji.hexcode) ||
          recentEmojiObjects.some((emoji) => emoji.hexcode === activeEmoji.hexcode))
      ? activeEmoji
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
        setActiveEmoji(emojiData);
        await copyEmojiToClipboard(emojiData.emoji);
        saveEmoji(emojiData.emoji);
        scheduleDeferredTask(() => {
          recordUsage(toManagedEmojiItem(emojiData));
        });
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

  const handleEmojiFocus = useCallback((emojiData: EmojiData) => {
    setActiveEmoji((previous) =>
      previous?.hexcode === emojiData.hexcode ? previous : emojiData,
    );
  }, []);

  const handleCopySelected = useCallback(() => {
    if (!resolvedSelectedEmoji) {
      return;
    }

    return handleEmojiClick(resolvedSelectedEmoji);
  }, [handleEmojiClick, resolvedSelectedEmoji]);

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
    <>
      <EmojiActionsStateSync
        key={resolvedSelectedEmoji?.hexcode ?? "none"}
        selectedEmoji={resolvedSelectedEmoji}
        onCopySelected={handleCopySelected}
      />
      <EmojiPicker
        emojis={orderedGridEmojis}
        pinnedEmojis={searchValue ? [] : pinnedEmojiObjects}
        recentEmojis={recentEmojiObjects}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onEmojiClick={handleEmojiClick}
        onEmojiFocus={handleEmojiFocus}
        selectedEmojiHexcode={resolvedSelectedEmoji?.hexcode ?? null}
        onBack={onBack}
        showError={!!copyError}
      />
    </>
  );
}
