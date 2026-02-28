import { FileText, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  return (
    <aside className="flex h-full min-h-0 w-[38%] shrink-0 flex-col border-r border-[var(--ui-divider)] bg-background/10">
      <div className="space-y-2 border-b border-[var(--ui-divider)] px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground/60" />
          <Input
            value={searchValue}
            onChange={(event) => {
              onSearchValueChange(event.target.value);
            }}
            placeholder="Search snippets..."
            className="h-9 pl-8"
          />
        </div>

        <Select
          value={selectedTag}
          onValueChange={(nextTag) => {
            onSelectedTagChange(nextTag ?? "all");
          }}
        >
          <SelectTrigger className="h-8 w-full justify-between text-xs">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          Snippets
        </p>

        {isLoading ? (
          <div className="space-y-2 px-1 py-1.5">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : null}

        {!isLoading && snippets.length === 0 ? (
          <div className="px-2 py-5 text-xs text-muted-foreground/70">No snippets found.</div>
        ) : null}

        {!isLoading
          ? snippets.map((snippet) => {
              const isSelected = snippet.id === selectedSnippetId;
              return (
                <button
                  key={snippet.id}
                  type="button"
                  onClick={() => {
                    onSelectSnippet(snippet.id);
                  }}
                  className={cn(
                    "group mb-1.5 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-muted/45 text-foreground"
                      : "text-muted-foreground hover:bg-muted/25 hover:text-foreground",
                  )}
                >
                  <FileText className="size-3.5 shrink-0 opacity-75" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{snippet.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {snippet.trigger}
                    </p>
                  </div>
                </button>
              );
            })
          : null}
      </div>
    </aside>
  );
}
