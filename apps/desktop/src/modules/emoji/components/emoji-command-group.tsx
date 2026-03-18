import { useQuery } from "@tanstack/react-query";
import { useCommandState } from "cmdk";
import { useMemo, useRef, useState } from "react";

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
import { useFilteredEmojis, useRecentEmojis, copyEmojiToClipboard } from "../hooks/useEmoji";

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
  const copyErrorTimerRef = useRef<number | null>(null);
  const { data: emojis = [], isLoading } = useQuery({
    queryKey: ["emoji-data"],
    queryFn: loadEmojiData,
    enabled: isOpen,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const { recentEmojis, saveEmoji } = useRecentEmojis(isOpen);
  const filteredEmojis = useFilteredEmojis(emojis, searchValue, selectedCategory);

  // Get recent emoji objects
  const recentEmojiObjects = useMemo(() => {
    return recentEmojis
      .map((emoji) => emojis.find((e) => e.emoji === emoji))
      .filter((e): e is EmojiData => e !== undefined);
  }, [recentEmojis, emojis]);
  const handleEmojiClick = async (emojiData: EmojiData) => {
    try {
      await copyEmojiToClipboard(emojiData.emoji);
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
  };

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
      emojis={filteredEmojis}
      recentEmojis={recentEmojiObjects}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      onEmojiClick={handleEmojiClick}
      onBack={onBack}
      showError={!!copyError}
    />
  );
}
