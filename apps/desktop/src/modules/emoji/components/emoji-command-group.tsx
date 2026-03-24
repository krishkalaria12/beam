import { useQuery } from "@tanstack/react-query";
import { useCommandState } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

// Import types
import type { EmojiData } from "../types";
import { CATEGORY_ORDER } from "../types";

// Import hooks
import { useRecentEmojis, copyEmojiToClipboard } from "../hooks/useEmoji";
import {
  clearEmojiActionsState,
  syncEmojiActionsState,
  toManagedEmojiItem,
} from "@/modules/emoji/hooks/use-emoji-action-items";
import { usePinnedEmojis } from "@/modules/emoji/hooks/use-pinned-emojis";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  useManagedItemPreferencesStore,
  useManagedItemRankedList,
} from "@/modules/launcher/managed-items";

// Import components
import { EmojiPicker } from "./EmojiPicker";
import { EmojiPickerLoading } from "./EmojiPickerLoading";

interface EmojiDataItem {
  label: string;
  hexcode: string;
  emoji?: string;
  tags?: string[];
  text?: string;
  type?: number;
  order?: number;
  group?: number;
  subgroup?: number;
  version?: number;
}

const EMOJI_KEYWORDS = [
  "emoji",
  "emoji picker",
  "emoticon",
  "smiley",
  "reaction",
  "kaomoji",
  "symbols",
] as const;

function processEmojiData(data: EmojiDataItem[]): EmojiData[] {
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

  processed.sort((a, b) => {
    const groupA = CATEGORY_ORDER.indexOf(a.group);
    const groupB = CATEGORY_ORDER.indexOf(b.group);
    if (groupA !== groupB) return groupA - groupB;
    return a.order - b.order;
  });

  return processed;
}

// Lazy load emoji data - only loads when emoji picker is opened
let emojiDataLoader: Promise<EmojiData[]> | null = null;

function loadEmojiData(): Promise<EmojiData[]> {
  if (!emojiDataLoader) {
    emojiDataLoader = import("emojibase-data/en/data.json").then((module) => {
      const data = module.default as unknown as EmojiDataItem[];
      return processEmojiData(data);
    });
  }
  return emojiDataLoader;
}

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
  const { data: emojis = [], isLoading } = useQuery({
    queryKey: ["emoji-data"],
    queryFn: loadEmojiData,
    enabled: isOpen,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

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
    getSearchableText: (emoji) => `${emoji.label} ${emoji.tags.join(" ")}`,
    compareFallback: (left, right) => left.order - right.order,
  });

  // Get recent emoji objects
  const recentEmojiObjects = useMemo(() => {
    return recentEmojis
      .map((emoji) => emojis.find((e) => e.emoji === emoji))
      .filter((e): e is EmojiData => e !== undefined);
  }, [recentEmojis, emojis]);
  const pinnedEmojiPool = useMemo(
    () => emojis.filter((emoji) => pinnedHexcodeSet.has(emoji.hexcode.toUpperCase())).slice(0, 16),
    [emojis, pinnedHexcodeSet],
  );
  const pinnedEmojiObjects = useManagedItemRankedList({
    items: pinnedEmojiPool,
    query: "",
    getManagedItem: toManagedEmojiItem,
    getSearchableText: (emoji) => `${emoji.label} ${emoji.tags.join(" ")}`,
    compareFallback: (left, right) => left.order - right.order,
  });
  const orderedGridEmojis = useMemo(() => {
    if (searchValue) {
      const pinnedSearchEmojis = filteredEmojis.filter((emoji) =>
        pinnedHexcodeSet.has(emoji.hexcode.toUpperCase()),
      );
      const unpinnedSearchEmojis = filteredEmojis.filter(
        (emoji) => !pinnedHexcodeSet.has(emoji.hexcode.toUpperCase()),
      );

      return [...pinnedSearchEmojis, ...unpinnedSearchEmojis];
    }

    return filteredEmojis.filter((emoji) => !pinnedHexcodeSet.has(emoji.hexcode.toUpperCase()));
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

  // Show skeleton loading state
  if (isLoading || emojis.length === 0) {
    return <EmojiPickerLoading />;
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
