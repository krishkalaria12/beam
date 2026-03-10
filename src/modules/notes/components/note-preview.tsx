import { Book, Pin, SquarePen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/modules/notes/types";

interface NotePreviewProps {
  note: Note | null;
  isDeleting: boolean;
  isTogglingPinned: boolean;
  onEdit: () => void;
  onTogglePinned: () => void;
  onDelete: () => void;
}

function formatTimestamp(value: number): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

export function NotePreview({
  note,
  isDeleting,
  isTogglingPinned,
  onEdit,
  onTogglePinned,
  onDelete,
}: NotePreviewProps) {
  if (!note) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="mb-4 size-12 rounded-xl bg-[var(--launcher-card-bg)] p-2.5">
          <Book className="size-full text-[var(--icon-primary-fg)]" />
        </div>
        <p className="text-[13px] text-muted-foreground">Select a note to preview</p>
      </section>
    );
  }

  return (
    <section className="note-preview-enter flex min-h-0 flex-1 flex-col">
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <article className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[var(--launcher-card-hover-bg)] p-1.5">
              {note.pinned
                ? <Pin className="size-full text-[var(--icon-orange-fg)]" />
                : <Book className="size-full text-[var(--icon-primary-fg)]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-foreground">
                {note.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Updated {formatTimestamp(note.updated_at)}
              </p>
            </div>
            {note.pinned
              ? (
                  <span className="rounded-full bg-[var(--icon-orange-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--icon-orange-fg)]">
                    Pinned
                  </span>
                )
              : null}
          </div>

          <div className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-6 text-muted-foreground">
              {note.content.trim() ? note.content : "This note is empty."}
            </pre>
          </div>
        </article>

        <section className="mt-4 rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Information
            </span>
            <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
          </div>

          <dl className="space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-muted-foreground">{formatTimestamp(note.created_at)}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="text-muted-foreground">{formatTimestamp(note.updated_at)}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Length</dt>
              <dd className="text-muted-foreground">{note.content.length} chars</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="notes-footer-enter flex h-14 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-3 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground",
          )}
        >
          <SquarePen className="size-3.5" />
          Edit
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePinned}
            disabled={isTogglingPinned}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-3 text-[12px] font-medium transition-all duration-200",
              "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground",
            )}
          >
            <Pin className="size-3.5" />
            {note.pinned ? "Unpin" : "Pin"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-[12px] font-medium text-destructive transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </section>
  );
}
