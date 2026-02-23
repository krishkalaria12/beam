import { useCommandState } from "cmdk";
import { useEffect, useMemo, useState, useCallback } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

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
  const query = searchInput.trim().toLowerCase();

  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copyError, setCopyError] = useState<string | null>(null);

  const { recentEmojis, saveEmoji } = useRecentEmojis(isOpen);
  const filteredEmojis = useFilteredEmojis(emojis, searchValue, selectedCategory);

  // Load emoji data when picker opens
  const loadEmojis = useCallback(async () => {
    if (emojis.length > 0 || isLoading) return;
    
    setIsLoading(true);
    try {
      const data = await loadEmojiData();
      setEmojis(data);
    } catch (error) {
      console.error("Failed to load emojis:", error);
    } finally {
      setIsLoading(false);
    }
  }, [emojis.length, isLoading]);

  useEffect(() => {
    if (isOpen && emojis.length === 0 && !isLoading) {
      loadEmojis();
    }
  }, [isOpen, emojis.length, isLoading, loadEmojis]);

  // Get recent emoji objects
  const recentEmojiObjects = useMemo(() => {
    return recentEmojis
      .map((emoji) => emojis.find((e) => e.emoji === emoji))
      .filter((e): e is EmojiData => e !== undefined);
  }, [recentEmojis, emojis]);

  // Skip first 26 emojis only when showing all categories
  const displayEmojis = selectedCategory === "all" ? filteredEmojis.slice(26) : filteredEmojis;

  // Clear copy error after timeout
  useEffect(() => {
    if (!copyError) return;
    const timeout = setTimeout(() => setCopyError(null), 1500);
    return () => clearTimeout(timeout);
  }, [copyError]);

  const handleEmojiClick = async (emojiData: EmojiData) => {
    try {
      await copyEmojiToClipboard(emojiData.emoji);
      saveEmoji(emojiData.emoji);
    } catch {
      setCopyError("Could not copy emoji");
    }
  };

  if (!isOpen) {
    const shouldShowOpenEmoji =
      query.length === 0 ||
      "emoji picker emoticon smiley reaction kaomoji symbols".includes(query);

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
  if (emojis.length === 0) {
    return <EmojiPickerLoading />;
  }

  return (
    <EmojiPicker
      emojis={displayEmojis}
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
