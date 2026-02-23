import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Search } from "lucide-react";
import { CommandPanelBackButton, CommandPanelHeader } from "@/components/command/command-panel-header";
import { Input } from "@/components/ui/input";
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
    <CommandPanelHeader>
      <CommandPanelBackButton onClick={onBack} aria-label="Back to commands" className="mr-2" />

      <div className="flex-1 flex items-center gap-2 rounded-md bg-secondary/50 px-4 h-9 border border-border/20 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <Search className="size-4 shrink-0 text-muted-foreground/50" />
        <Input
          autoFocus
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-full w-full border-none shadow-none focus-visible:ring-0 bg-transparent text-sm px-0 placeholder:text-muted-foreground/50"
          placeholder="Search emoji..."
        />
      </div>

      <div className="flex items-center gap-2 pl-2">
        <Select
          value={selectedCategory}
          onValueChange={(value) => value && onCategoryChange(value)}
        >
          <SelectTrigger className="h-9 min-w-[120px] border-border/40 bg-secondary text-xs font-medium hover:bg-secondary/80 focus:ring-primary/20 transition-all rounded-md shadow-sm">
            <SelectValue>
              {selectedCategory === "all" ? "All Categories" : CATEGORY_LABELS[parseInt(selectedCategory)]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] border-border/20 bg-background/95 backdrop-blur-xl">
            <SelectItem value="all" className="text-xs font-medium">
              All Categories
            </SelectItem>
            {CATEGORY_ORDER.map((groupNum) => (
              <SelectItem key={groupNum} value={groupNum.toString()} className="text-xs">
                {CATEGORY_LABELS[groupNum]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showError && (
          <span className="flex items-center justify-center rounded-full bg-amber-500/10 p-1.5 text-amber-500 animate-in fade-in zoom-in">
            <AlertTriangle className="size-4" />
          </span>
        )}
      </div>
    </CommandPanelHeader>
  );
}
