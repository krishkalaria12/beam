import { useRef } from "react";
import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { type EmojiData } from "../types";
import { EmojiGrid } from "./EmojiGrid";
import { RecentlyUsed } from "./RecentlyUsed";
import { SearchBar } from "./SearchBar";

interface EmojiPickerProps {
  emojis: EmojiData[];
  recentEmojis: EmojiData[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onEmojiClick: (emoji: EmojiData) => void;
  onBack: () => void;
  showError?: boolean;
}

export function EmojiPicker({
  emojis,
  recentEmojis,
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onEmojiClick,
  onBack,
  showError,
}: EmojiPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col">
      <SearchBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        onBack={onBack}
        showError={showError}
      />

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-4 scroll-smooth custom-scrollbar"
      >
        <div className="mx-auto max-w-5xl space-y-8 pb-10">
          <RecentlyUsed emojis={recentEmojis} onEmojiClick={onEmojiClick} />

          <EmojiGrid emojis={emojis} onEmojiClick={onEmojiClick} />
        </div>
      </div>

      <CommandFooterBar
        leftSlot={<span>{emojis.length} emojis</span>}
        rightSlot={<CommandKeyHint keyLabel="ESC" label="Back" />}
      />
    </div>
  );
}
