import { useRef } from "react";
import { Smile, Sparkles } from "lucide-react";
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
    <div className="emoji-picker-enter flex h-full flex-col text-white">
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
        className="emoji-content-enter flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-4 scroll-smooth scrollbar-hidden-until-hover"
      >
        <div className="space-y-6 pb-6">
          {/* Only show recent emojis when not searching */}
          {!searchValue && (
            <RecentlyUsed emojis={recentEmojis} onEmojiClick={onEmojiClick} />
          )}

          <EmojiGrid emojis={emojis} onEmojiClick={onEmojiClick} />
        </div>
      </div>

      {/* Footer - refined and minimal */}
      <footer className="emoji-footer-enter flex h-11 shrink-0 items-center justify-between border-t border-white/[0.05] px-5">
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <div className="flex size-5 items-center justify-center rounded-md bg-white/[0.04]">
            <Smile className="size-3" />
          </div>
          <span className="font-medium">{emojis.length.toLocaleString()} emojis</span>
          {recentEmojis.length > 0 && (
            <>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1">
                <Sparkles className="size-2.5" />
                {recentEmojis.length} recent
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white/25">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              Enter
            </kbd>
            Copy
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              Esc
            </kbd>
            Back
          </span>
        </div>
      </footer>
    </div>
  );
}
