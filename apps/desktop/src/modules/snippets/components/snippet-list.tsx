import { ChevronDown, FileText, Search, Tag } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Snippet } from "@/modules/snippets/types";

interface SnippetListProps {
  snippets: Snippet[];
  selectedSnippetId: string | null;
  isLoading: boolean;
  searchValue: string;
  selectedTag: string;
  tags: string[];
  onSearchValueChange: (nextValue: string) => void;
  onSelectSnippet: (snippetId: string) => void;
  onSelectedTagChange: (nextTag: string) => void;
}

export function SnippetList({
  snippets,
  selectedSnippetId,
  isLoading,
  searchValue,
  selectedTag,
  tags,
  onSearchValueChange,
  onSelectSnippet,
  onSelectedTagChange,
}: SnippetListProps) {
  const currentTagLabel = selectedTag === "all" ? "All tags" : selectedTag;

  return (
    <aside className="flex h-full min-h-0 w-[38%] shrink-0 flex-col border-r border-[var(--launcher-card-border)]">
      {/* Search & Filter */}
      <div className="space-y-2 border-b border-[var(--launcher-card-border)] px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(event) => {
              onSearchValueChange(event.target.value);
            }}
            placeholder="Search snippets..."
            className={cn(
              "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-9 pr-3 text-launcher-md text-foreground placeholder:text-muted-foreground",
              "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--ring)]",
            )}
          />
        </div>

        {/* Tag Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-full items-center gap-2 rounded-lg bg-[var(--launcher-card-hover-bg)] px-3 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-foreground">
            <Tag className="size-3.5 text-muted-foreground" />
            <span className="flex-1 truncate text-left">{currentTagLabel}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-60 w-48 overflow-y-auto rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
          >
            <DropdownMenuRadioGroup
              value={selectedTag}
              onValueChange={(value) => onSelectedTagChange(value || "all")}
            >
              <DropdownMenuRadioItem
                value="all"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-launcher-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground focus:bg-[var(--launcher-chip-bg)] data-[state=checked]:text-foreground"
              >
                All tags
              </DropdownMenuRadioItem>
              {tags.map((tag) => (
                <DropdownMenuRadioItem
                  key={tag}
                  value={tag}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-launcher-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground focus:bg-[var(--launcher-chip-bg)] data-[state=checked]:text-foreground"
                >
                  {tag}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Snippet List */}
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {/* Section Header */}
        <div className="mb-2 flex items-center gap-3 px-2 pt-1">
          <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Snippets
          </span>
          <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-1.5 px-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--launcher-card-hover-bg)]"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && snippets.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-3 size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2">
              <FileText className="size-full text-[var(--icon-orange-fg)]" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">No snippets found</p>
          </div>
        )}

        {/* Snippet Items */}
        {!isLoading &&
          snippets.map((snippet, index) => {
            const isSelected = snippet.id === selectedSnippetId;
            return (
              <Button
                key={snippet.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelectSnippet(snippet.id);
                }}
                className={cn(
                  "snippet-list-item group relative mb-1.5 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
                  isSelected
                    ? "bg-[var(--launcher-chip-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                    : "hover:bg-[var(--launcher-card-hover-bg)]",
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Left Accent Bar */}
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
                    isSelected
                      ? "bg-[var(--ring)]"
                      : "bg-transparent group-hover:bg-[var(--launcher-card-selected-bg)]",
                  )}
                />

                {/* Icon */}
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    isSelected
                      ? "bg-[var(--launcher-card-bg)]"
                      : "bg-[var(--launcher-card-hover-bg)] group-hover:bg-[var(--launcher-chip-bg)]",
                  )}
                >
                  <FileText
                    className={cn(
                      "size-4 transition-colors duration-200",
                      isSelected
                        ? "text-[var(--icon-orange-fg)]"
                        : "text-muted-foreground group-hover:text-muted-foreground",
                    )}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-launcher-md font-medium tracking-[-0.01em] transition-colors duration-200",
                      isSelected
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {snippet.name}
                  </p>
                  <p className="truncate text-launcher-xs text-muted-foreground">{snippet.trigger}</p>
                </div>

                {/* Tags indicator */}
                {snippet.tags.length > 0 && (
                  <span className="shrink-0 rounded-full bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 text-launcher-2xs text-muted-foreground">
                    {snippet.tags.length}
                  </span>
                )}
              </Button>
            );
          })}
      </div>
    </aside>
  );
}
