import { ChevronDown, FileText, Search, Tag } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <aside className="flex h-full min-h-0 w-[38%] shrink-0 flex-col border-r border-white/[0.06]">
      {/* Search & Filter */}
      <div className="space-y-2 border-b border-white/[0.06] px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => {
              onSearchValueChange(event.target.value);
            }}
            placeholder="Search snippets..."
            className={cn(
              "h-10 w-full rounded-xl bg-white/[0.04] pl-9 pr-3 text-[13px] text-white/90 placeholder:text-white/30",
              "ring-1 ring-white/[0.06] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
            )}
          />
        </div>

        {/* Tag Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-full items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[12px] font-medium text-white/70 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.06] hover:text-white/90">
            <Tag className="size-3.5 text-white/40" />
            <span className="flex-1 truncate text-left">{currentTagLabel}</span>
            <ChevronDown className="size-3.5 text-white/30" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-60 w-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#2c2c2c] p-1.5 shadow-xl"
          >
            <DropdownMenuRadioGroup
              value={selectedTag}
              onValueChange={(value) => onSelectedTagChange(value || "all")}
            >
              <DropdownMenuRadioItem
                value="all"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90 focus:bg-white/[0.06] data-[state=checked]:text-white"
              >
                All tags
              </DropdownMenuRadioItem>
              {tags.map((tag) => (
                <DropdownMenuRadioItem
                  key={tag}
                  value={tag}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90 focus:bg-white/[0.06] data-[state=checked]:text-white"
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Snippets
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-1.5 px-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && snippets.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-3 size-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-2">
              <FileText className="size-full text-amber-400/60" />
            </div>
            <p className="text-[12px] text-white/40">No snippets found</p>
          </div>
        )}

        {/* Snippet Items */}
        {!isLoading &&
          snippets.map((snippet, index) => {
            const isSelected = snippet.id === selectedSnippetId;
            return (
              <button
                key={snippet.id}
                type="button"
                onClick={() => {
                  onSelectSnippet(snippet.id);
                }}
                className={cn(
                  "snippet-list-item group relative mb-1.5 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
                  isSelected ? "bg-white/[0.06] ring-1 ring-white/20" : "hover:bg-white/[0.04]",
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Left Accent Bar */}
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
                    isSelected
                      ? "bg-[var(--solid-accent,#4ea2ff)]"
                      : "bg-transparent group-hover:bg-white/20",
                  )}
                />

                {/* Icon */}
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    isSelected
                      ? "bg-gradient-to-br from-amber-500/25 to-orange-500/25"
                      : "bg-white/[0.04] group-hover:bg-white/[0.06]",
                  )}
                >
                  <FileText
                    className={cn(
                      "size-4 transition-colors duration-200",
                      isSelected ? "text-amber-400" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium tracking-[-0.01em] transition-colors duration-200",
                      isSelected ? "text-white/90" : "text-white/70 group-hover:text-white/85",
                    )}
                  >
                    {snippet.name}
                  </p>
                  <p className="truncate text-[11px] text-white/35">{snippet.trigger}</p>
                </div>

                {/* Tags indicator */}
                {snippet.tags.length > 0 && (
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/35">
                    {snippet.tags.length}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </aside>
  );
}
