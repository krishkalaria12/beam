import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ChevronLeft, Search, Grid3X3 } from "lucide-react";
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
  return (
    <div className="emoji-header flex h-[60px] items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] text-foreground/40 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70 hover:ring-[var(--launcher-card-border)]"
        aria-label="Back to commands"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Search input - larger and more prominent */}
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 h-10 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus-within:ring-[var(--ring)] focus-within:bg-[var(--launcher-card-hover-bg)]">
        <Search className="size-4 shrink-0 text-foreground/30" />
        <input
          autoFocus
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-full w-full border-none bg-transparent text-[14px] text-foreground/90 placeholder:text-foreground/30 focus:outline-none tracking-[-0.02em]"
          placeholder="Search emojis..."
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="flex size-5 items-center justify-center rounded-md bg-[var(--launcher-card-hover-bg)] text-foreground/40 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/60 transition-colors"
          >
            <span className="text-[12px] leading-none">×</span>
          </button>
        )}
      </div>

      {/* Category selector - enhanced */}
      <div className="flex items-center gap-2">
        <Select
          value={selectedCategory}
          onValueChange={(value) => value && onCategoryChange(value)}
        >
          <SelectTrigger className="h-10 min-w-[150px] gap-2 rounded-xl border-0 bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)] text-[12px] font-medium text-foreground/70 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90 hover:ring-[var(--launcher-card-border)] focus:ring-[var(--ring)] transition-all duration-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {CATEGORY_ICONS[selectedCategory] || CATEGORY_ICONS[parseInt(selectedCategory)]}
              </span>
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
              className="rounded-lg text-[12px] font-medium text-foreground/80 focus:bg-[var(--launcher-card-hover-bg)] focus:text-foreground"
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
                className="rounded-lg text-[12px] text-foreground/70 focus:bg-[var(--launcher-card-hover-bg)] focus:text-foreground"
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
          <span className="emoji-error-badge flex size-9 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20 text-amber-400">
            <AlertTriangle className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
