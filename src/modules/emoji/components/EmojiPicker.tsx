import { useRef } from "react";
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
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background p-3"
      >
        <div className="space-y-4">
          <RecentlyUsed emojis={recentEmojis} onEmojiClick={onEmojiClick} />

          <EmojiGrid emojis={emojis} onEmojiClick={onEmojiClick} />
        </div>
      </div>
    </div>
  );
}
