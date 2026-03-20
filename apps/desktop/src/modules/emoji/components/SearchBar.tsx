import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IconChip, SearchInput } from "@/components/module";
import { AlertTriangle, ChevronLeft, Search } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../types";

interface SearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onBack: () => void;
  showError?: boolean;
}

// Category icons for the dropdown
const CATEGORY_ICONS: Record<number | string, string> = {
  all: "📚",
  0: "😀",
  1: "👋",
  2: "🐶",
  3: "🍕",
  4: "✈️",
  5: "⚽",
  6: "💡",
  7: "🔣",
  8: "🚩",
};

export function SearchBar({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onBack,
  showError,
}: SearchBarProps) {
  const selectedCategoryIcon =
    CATEGORY_ICONS[selectedCategory] ?? CATEGORY_ICONS[parseInt(selectedCategory)];

  return (
    <div className="emoji-header flex h-[60px] items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
      {/* Back button */}
      <Button
        type="button"
        onClick={onBack}
        size="icon-lg"
        variant="ghost"
        className="rounded-xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)] text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
        aria-label="Back to commands"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search emojis..."
        leftIcon={<Search />}
        className="tracking-[-0.02em]"
        rightSlot={
          searchValue ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => onSearchChange("")}
              className="rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <span className="text-launcher-sm leading-none">x</span>
            </Button>
          ) : null
        }
      />

      {/* Category selector - enhanced */}
      <div className="flex items-center gap-2">
        <Select
          value={selectedCategory}
          onValueChange={(value) => value && onCategoryChange(value)}
        >
          <SelectTrigger className="h-10 min-w-[150px] gap-2 rounded-xl border-0 bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)] px-3 text-launcher-sm font-medium text-foreground hover:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] transition-all duration-200">
            <div className="flex items-center gap-2">
              <span className="text-launcher-sm">{selectedCategoryIcon}</span>
              <SelectValue>
                {selectedCategory === "all"
                  ? "All Categories"
                  : CATEGORY_LABELS[parseInt(selectedCategory)]}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[320px] rounded-xl border-[var(--launcher-card-border)] bg-[var(--popover)] p-1 shadow-xl">
            <SelectItem
              value="all"
              className="rounded-lg text-launcher-sm font-medium focus:bg-[var(--launcher-card-hover-bg)]"
            >
              <div className="flex items-center gap-2">
                <span>📚</span>
                <span>All Categories</span>
              </div>
            </SelectItem>
            {CATEGORY_ORDER.map((groupNum) => (
              <SelectItem
                key={groupNum}
                value={groupNum.toString()}
                className="rounded-lg text-launcher-sm focus:bg-[var(--launcher-card-hover-bg)]"
              >
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[groupNum]}</span>
                  <span>{CATEGORY_LABELS[groupNum]}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Error indicator */}
        {showError && (
          <span className="emoji-error-badge">
            <IconChip
              variant="orange"
              size="lg"
              className="ring-1 ring-[var(--launcher-card-border)]"
            >
              <AlertTriangle className="size-4" />
            </IconChip>
          </span>
        )}
      </div>
    </div>
  );
}
