import { ArrowLeft, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ClipboardContentType, type ClipboardTypeFilter } from "../types";

interface ClipboardHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBack: () => void;
  typeFilter: ClipboardTypeFilter;
  onTypeFilterChange: (value: ClipboardTypeFilter) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const TYPE_FILTER_LABELS: Record<ClipboardTypeFilter, string> = {
  all: "All Types",
  [ClipboardContentType.Text]: "Text",
  [ClipboardContentType.Link]: "Links",
  [ClipboardContentType.Image]: "Images",
};

export function ClipboardHeader({
  query,
  onQueryChange,
  onKeyDown,
  onBack,
  typeFilter,
  onTypeFilterChange,
  inputRef,
}: ClipboardHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--ui-divider)] px-4">
      <button
        onClick={onBack}
        className="flex items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground size-8"
        aria-label="Back"
      >
        <ArrowLeft className="size-5" />
      </button>

      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-md bg-transparent text-[16px] outline-none placeholder:text-muted-foreground/30 text-foreground font-medium tracking-tight"
          placeholder="Type to filter entries..."
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5 border border-border/20 text-muted-foreground/80 hover:bg-foreground/10 transition-colors cursor-pointer group text-xs font-semibold"
            onKeyDown={(event) => event.stopPropagation()}
          >
            <span className="group-hover:text-foreground transition-colors">{TYPE_FILTER_LABELS[typeFilter]}</span>
            <ChevronDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-lg border border-border/40 bg-background/95 p-1">
            <DropdownMenuRadioGroup
              value={typeFilter}
              onValueChange={(value) => onTypeFilterChange(value as ClipboardTypeFilter)}
            >
              <DropdownMenuRadioItem value="all">All Types</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={ClipboardContentType.Text}>Text</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={ClipboardContentType.Link}>Links</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={ClipboardContentType.Image}>Images</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
