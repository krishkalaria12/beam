import { Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NoteEditorDraft } from "@/modules/notes/types";

interface NoteEditorProps {
  mode: "create" | "edit";
  draft: NoteEditorDraft;
  isSubmitting: boolean;
  onDraftChange: (nextDraft: NoteEditorDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function NoteEditor({
  mode,
  draft,
  isSubmitting,
  onDraftChange,
  onCancel,
  onSubmit,
}: NoteEditorProps) {
  return (
    <section className="note-editor-enter relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Title
          </label>
          <Input
            type="text"
            value={draft.title}
            onChange={(event) => {
              onDraftChange({
                ...draft,
                title: event.target.value,
              });
            }}
            placeholder="Note title"
            className={cn(
              "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-[13px] text-foreground placeholder:text-muted-foreground",
              "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--ring)]",
            )}
          />
        </div>

        <div className="min-h-0 flex-1">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Content
          </label>
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
            <Textarea
              value={draft.content}
              onChange={(event) => {
                onDraftChange({
                  ...draft,
                  content: event.target.value,
                });
              }}
              placeholder="Write your note here..."
              className="min-h-0 flex-1 resize-none border-none bg-transparent p-4 text-[14px] leading-6 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
        </div>

        <section className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[var(--launcher-card-hover-bg)] p-1.5">
                <Pin className="size-full text-[var(--icon-orange-fg)]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">Pin note</p>
                <p className="text-[11px] text-muted-foreground">
                  Pinned notes stay at the top of the list.
                </p>
              </div>
            </div>
            <Switch
              checked={draft.pinned}
              onCheckedChange={(checked) => {
                onDraftChange({
                  ...draft,
                  pinned: checked,
                });
              }}
            />
          </div>
        </section>
      </div>

      <div className="notes-footer-enter flex h-14 shrink-0 items-center justify-end gap-2 border-t border-[var(--footer-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-[12px] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px]"
        >
          {isSubmitting ? "Saving..." : mode === "create" ? "Create note" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}
