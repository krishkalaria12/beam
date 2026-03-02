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
    <div className="emoji-header flex h-[60px] items-center gap-3 border-b border-white/[0.05] px-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex size-10 items-center justify-center rounded-xl bg-white/[0.03] text-white/40 ring-1 ring-white/[0.04] transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70 hover:ring-white/[0.08]"
        aria-label="Back to commands"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Search input - larger and more prominent */}
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/[0.035] px-4 h-10 ring-1 ring-white/[0.05] transition-all duration-200 focus-within:ring-[var(--solid-accent,#4ea2ff)] focus-within:bg-white/[0.05]">
        <Search className="size-4 shrink-0 text-white/30" />
        <input
          autoFocus
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-full w-full border-none bg-transparent text-[14px] text-white/90 placeholder:text-white/30 focus:outline-none tracking-[-0.02em]"
          placeholder="Search emojis..."
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="flex size-5 items-center justify-center rounded-md bg-white/[0.08] text-white/40 hover:bg-white/[0.12] hover:text-white/60 transition-colors"
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
          <SelectTrigger className="h-10 min-w-[150px] gap-2 rounded-xl border-0 bg-white/[0.035] ring-1 ring-white/[0.05] text-[12px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white/90 hover:ring-white/[0.08] focus:ring-[var(--solid-accent,#4ea2ff)] transition-all duration-200">
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
          <SelectContent className="max-h-[320px] rounded-xl border-white/[0.08] bg-[#2c2c2c] p-1 shadow-xl">
            <SelectItem
              value="all"
              className="rounded-lg text-[12px] font-medium text-white/80 focus:bg-white/[0.06] focus:text-white"
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
                className="rounded-lg text-[12px] text-white/70 focus:bg-white/[0.06] focus:text-white"
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
