import { ArrowLeft, FileText, ImageIcon, Link, Search, X } from "lucide-react";

import { SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ClipboardContentType, type ClipboardTypeFilter } from "../types";

interface ClipboardHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBack: () => void;
  typeFilter: ClipboardTypeFilter;
  onTypeFilterChange: (value: ClipboardTypeFilter) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

const TYPE_FILTER_OPTIONS: { value: ClipboardTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
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
  return (
    <div className="clipboard-header border-b border-[var(--ui-divider)]">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="size-7 rounded-md text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Button>

        <SearchInput
          ref={inputRef}
          value={query}
          onChange={onQueryChange}
          onKeyDown={onKeyDown}
          placeholder="Search clipboard history..."
          leftIcon={<Search />}
          rightSlot={
            query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Clear search</span>
              </button>
            ) : null
          }
          className="text-launcher-sm font-medium"
          containerClassName="h-10 rounded-lg"
        />
      </div>

      <div className="flex items-center gap-1 px-5 py-2.5">
        {TYPE_FILTER_OPTIONS.map((option) => {
          const selected = typeFilter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTypeFilterChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-launcher-xs transition-colors",
                selected
                  ? "border-[var(--launcher-card-border)] bg-[var(--launcher-card-selected-bg)] text-foreground"
                  : "border-transparent text-muted-foreground hover:border-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground",
              )}
            >
              {option.icon ? <span>{option.icon}</span> : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
