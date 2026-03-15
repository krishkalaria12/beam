import { useRef } from "react";
import { Smile, Sparkles } from "lucide-react";
import { IconChip, ModuleFooter } from "@/components/module";
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
    <div className="emoji-picker-enter flex h-full flex-col text-foreground">
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
          {!searchValue && <RecentlyUsed emojis={recentEmojis} onEmojiClick={onEmojiClick} />}

          <EmojiGrid emojis={emojis} onEmojiClick={onEmojiClick} />
        </div>
      </div>

      <ModuleFooter
        className="emoji-footer-enter h-11 px-5"
        leftSlot={
          <>
            <IconChip variant="neutral" size="xs">
              <Smile className="size-3" />
            </IconChip>
            <span className="font-medium">{emojis.length.toLocaleString()} emojis</span>
            {recentEmojis.length > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="size-2.5" />
                  {recentEmojis.length} recent
                </span>
              </>
            )}
          </>
        }
        shortcuts={[
          { keys: ["Enter"], label: "Copy" },
          { keys: ["Esc"], label: "Back" },
        ]}
      />
    </div>
  );
}
