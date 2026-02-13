import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../types";

interface SearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onBack: () => void;
  showError?: boolean;
}

export function SearchBar({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onBack,
  showError,
}: SearchBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700 bg-zinc-800 px-3 py-2">
      <button
        type="button"
        aria-label="Back to commands"
        className="inline-flex size-8 flex-none items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </button>

      <input
        type="text"
        autoFocus
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-700/50 px-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
        placeholder="search emoji"
      />

      <Select
        value={selectedCategory}
        onValueChange={(value: string | null) => value && onCategoryChange(value)}
      >
        <SelectTrigger className="h-9 min-w-25 border-zinc-700 bg-zinc-800 text-xs">
          <span className="text-zinc-200">
            {selectedCategory === "all" ? "All" : CATEGORY_LABELS[parseInt(selectedCategory)]}
          </span>
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-800">
          <SelectItem value="all" className="text-zinc-100">
            All
          </SelectItem>
          {CATEGORY_ORDER.map((groupNum) => (
            <SelectItem key={groupNum} value={groupNum.toString()} className="text-zinc-100">
              {CATEGORY_LABELS[groupNum]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showError && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
          <AlertTriangle className="size-3.5" />
        </span>
      )}
    </div>
  );
}
