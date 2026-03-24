import { useRef } from "react";
import { Smile, Sparkles } from "lucide-react";
import { IconChip, ModuleFooter } from "@/components/module";
import { type EmojiData } from "../types";
import { EmojiGrid } from "./EmojiGrid";
import { RecentlyUsed } from "./RecentlyUsed";
import { SearchBar } from "./SearchBar";

interface EmojiPickerProps {
  emojis: EmojiData[];
  pinnedEmojis: EmojiData[];
  recentEmojis: EmojiData[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onEmojiClick: (emoji: EmojiData) => void;
  onEmojiHover?: (emoji: EmojiData) => void;
  onBack: () => void;
  showError?: boolean;
}

export function EmojiPicker({
  emojis,
  pinnedEmojis,
  recentEmojis,
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onEmojiClick,
  onEmojiHover,
  onBack,
  showError,
}: EmojiPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="emoji-picker-enter flex h-full min-h-0 flex-col overflow-hidden text-foreground">
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
        <div className="space-y-6 pb-4">
          {!searchValue && pinnedEmojis.length > 0 ? (
            <RecentlyUsed
              emojis={pinnedEmojis}
              onEmojiClick={onEmojiClick}
              onEmojiHover={onEmojiHover}
              title="Pinned"
            />
          ) : null}
          {/* Only show recent emojis when not searching */}
          {!searchValue && (
            <RecentlyUsed
              emojis={recentEmojis}
              onEmojiClick={onEmojiClick}
              onEmojiHover={onEmojiHover}
            />
          )}

          <EmojiGrid emojis={emojis} onEmojiClick={onEmojiClick} onEmojiHover={onEmojiHover} />
        </div>
      </div>

      <ModuleFooter
        className="emoji-footer-enter z-10 h-11 border-t border-[var(--ui-divider)] bg-[var(--launcher-bg)]/96 px-5 backdrop-blur"
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
