import { ArrowLeft, ChevronDown, FileText, ImageIcon, Link, Search } from "lucide-react";

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

const TYPE_FILTER_OPTIONS: { value: ClipboardTypeFilter; label: string; icon: React.ReactNode }[] =
  [
    { value: "all", label: "All Types", icon: null },
    { value: ClipboardContentType.Text, label: "Text", icon: <FileText className="size-3.5" /> },
    { value: ClipboardContentType.Link, label: "Links", icon: <Link className="size-3.5" /> },
    {
      value: ClipboardContentType.Image,
      label: "Images",
      icon: <ImageIcon className="size-3.5" />,
    },
  ];

export function ClipboardHeader({
  query,
  onQueryChange,
  onKeyDown,
  onBack,
  typeFilter,
  onTypeFilterChange,
  inputRef,
}: ClipboardHeaderProps) {
  const currentFilter = TYPE_FILTER_OPTIONS.find((f) => f.value === typeFilter);

  return (
    <div className="clipboard-header flex items-center gap-3 px-5 py-4">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-foreground/40 transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70"
      >
        <ArrowLeft className="size-4" />
      </button>

      {/* Search Input */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="size-4 text-foreground/25" />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-10 pr-4 text-[14px] font-medium tracking-[-0.01em] text-foreground/90 outline-none ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-foreground/25 focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--launcher-card-border)]"
          placeholder="Search clipboard history..."
          autoFocus
        />
      </div>

      {/* Type Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 text-[12px] font-medium tracking-[-0.01em] text-foreground/60 ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/80"
          onKeyDown={(event) => event.stopPropagation()}
        >
          {currentFilter?.icon && <span className="text-foreground/40">{currentFilter.icon}</span>}
          <span>{currentFilter?.label || "All Types"}</span>
          <ChevronDown className="size-3.5 text-foreground/30" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
        >
          <DropdownMenuRadioGroup
            value={typeFilter}
            onValueChange={(value) => onTypeFilterChange(value as ClipboardTypeFilter)}
          >
            {TYPE_FILTER_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90 focus:bg-[var(--launcher-card-hover-bg)] data-[state=checked]:text-foreground"
              >
                {option.icon && <span className="text-foreground/40">{option.icon}</span>}
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
