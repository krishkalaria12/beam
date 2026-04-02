import { Book, Pin, Plus, Search } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Note } from "@/modules/notes/types";

const NOTE_ROW_HEIGHT = 96;

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  isLoading: boolean;
  searchValue: string;
  onSearchValueChange: (nextValue: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
}

function excerptContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Empty note";
  }

  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
}

const SKELETON_DELAYS_MS = [0, 50, 100, 150] as const;

export function NotesList({
  notes,
  selectedNoteId,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelectNote,
  onCreateNote,
}: NotesListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => NOTE_ROW_HEIGHT,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const selectedNoteIndex = selectedNoteId
    ? notes.findIndex((note) => note.id === selectedNoteId)
    : -1;

  useLayoutEffect(() => {
    if (selectedNoteIndex < 0) {
      return;
    }

    rowVirtualizer.scrollToIndex(selectedNoteIndex, { align: "auto" });
  }, [rowVirtualizer, selectedNoteIndex]);

  return (
    <aside className="flex h-full min-h-0 w-[38%] shrink-0 flex-col border-r border-[var(--launcher-card-border)]">
      <div className="space-y-2 border-b border-[var(--launcher-card-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Notes
            </p>
            <p className="text-launcher-sm text-muted-foreground">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateNote}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-sm text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
          >
            <Plus className="size-3.5" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(event) => {
              onSearchValueChange(event.target.value);
            }}
            placeholder="Search notes..."
            className={cn(
              "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-9 pr-3 text-launcher-md text-foreground placeholder:text-muted-foreground",
              "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--ring)]",
            )}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2"
      >
        {isLoading ? (
          <div className="space-y-1.5 px-1">
            {SKELETON_DELAYS_MS.map((delayMs) => (
              <div
                key={`skeleton:${delayMs}`}
                className="h-16 animate-pulse rounded-xl bg-[var(--launcher-card-hover-bg)]"
                style={{ animationDelay: `${delayMs}ms` }}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2">
              <Book className="size-full text-[var(--icon-primary-fg)]" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">No notes found</p>
          </div>
        ) : null}

        {!isLoading && notes.length > 0 ? (
          <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {virtualRows.map((virtualRow) => {
              const note = notes[virtualRow.index];
              if (!note) {
                return null;
              }

              const isSelected = note.id === selectedNoteId;

              return (
                <div
                  key={note.id}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onSelectNote(note.id);
                    }}
                    className={cn(
                      "notes-list-item group relative mb-1.5 flex h-auto w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-200",
                      isSelected
                        ? "bg-[var(--launcher-chip-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                        : "hover:bg-[var(--launcher-card-hover-bg)]",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
                        isSelected
                          ? "bg-[var(--ring)]"
                          : "bg-transparent group-hover:bg-[var(--launcher-card-selected-bg)]",
                      )}
                    />

                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        isSelected
                          ? "bg-[var(--launcher-card-bg)]"
                          : "bg-[var(--launcher-card-hover-bg)] group-hover:bg-[var(--launcher-chip-bg)]",
                      )}
                    >
                      {note.pinned ? (
                        <Pin className="size-4 text-[var(--icon-orange-fg)]" />
                      ) : (
                        <Book className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-launcher-md font-medium tracking-[-0.01em] transition-colors duration-200",
                            isSelected
                              ? "text-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          {note.title}
                        </p>
                        {note.pinned ? (
                          <span className="shrink-0 rounded-full bg-[var(--icon-orange-bg)] px-1.5 py-0.5 text-launcher-2xs font-medium text-[var(--icon-orange-fg)]">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-launcher-xs leading-5 text-muted-foreground">
                        {excerptContent(note.content)}
                      </p>
                    </div>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
