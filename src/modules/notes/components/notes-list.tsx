import { Book, Pin, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Note } from "@/modules/notes/types";

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

export function NotesList({
  notes,
  selectedNoteId,
  isLoading,
  searchValue,
  onSearchValueChange,
  onSelectNote,
  onCreateNote,
}: NotesListProps) {
  return (
    <aside className="flex h-full min-h-0 w-[38%] shrink-0 flex-col border-r border-[var(--launcher-card-border)]">
      <div className="space-y-2 border-b border-[var(--launcher-card-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Notes
            </p>
            <p className="text-[12px] text-muted-foreground">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateNote}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-[12px] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
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
              "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground",
              "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--ring)]",
            )}
          />
        </div>
      </div>

      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading
          ? (
              <div className="space-y-1.5 px-1">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-[var(--launcher-card-hover-bg)]"
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                ))}
              </div>
            )
          : null}

        {!isLoading && notes.length === 0
          ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="mb-3 size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2">
                  <Book className="size-full text-[var(--icon-primary-fg)]" />
                </div>
                <p className="text-[12px] text-muted-foreground">No notes found</p>
              </div>
            )
          : null}

        {!isLoading &&
          notes.map((note, index) => {
            const isSelected = note.id === selectedNoteId;

            return (
              <Button
                key={note.id}
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
                style={{ animationDelay: `${index * 30}ms` }}
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
                  {note.pinned
                    ? <Pin className="size-4 text-[var(--icon-orange-fg)]" />
                    : <Book className="size-4 text-muted-foreground" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "truncate text-[13px] font-medium tracking-[-0.01em] transition-colors duration-200",
                        isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {note.title}
                    </p>
                    {note.pinned
                      ? (
                          <span className="shrink-0 rounded-full bg-[var(--icon-orange-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--icon-orange-fg)]">
                            Pinned
                          </span>
                        )
                      : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                    {excerptContent(note.content)}
                  </p>
                </div>
              </Button>
            );
          })}
      </div>
    </aside>
  );
}
