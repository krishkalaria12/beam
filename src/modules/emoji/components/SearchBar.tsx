import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
} from "@/components/command/command-panel-header";
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
    <CommandPanelHeader className="gap-2 border-border bg-accent px-3 py-2">
      <CommandPanelBackButton onClick={onBack} aria-label="Back to commands" />

      <input
        type="text"
        autoFocus
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-border/80"
        placeholder="search emoji"
      />

      <Select
        value={selectedCategory}
        onValueChange={(value: string | null) => value && onCategoryChange(value)}
      >
        <SelectTrigger className="h-9 min-w-25 border-border bg-background text-xs">
          <span className="text-foreground/90">
            {selectedCategory === "all" ? "All" : CATEGORY_LABELS[parseInt(selectedCategory)]}
          </span>
        </SelectTrigger>
        <SelectContent className="border-border bg-popover">
          <SelectItem value="all" className="text-foreground">
            All
          </SelectItem>
          {CATEGORY_ORDER.map((groupNum) => (
            <SelectItem key={groupNum} value={groupNum.toString()} className="text-foreground">
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
    </CommandPanelHeader>
  );
}
