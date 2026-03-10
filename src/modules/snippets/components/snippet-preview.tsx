import { Copy, FileText, MoreHorizontal, PenSquare, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Snippet } from "@/modules/snippets/types";

interface SnippetPreviewProps {
  snippet: Snippet | null;
  isCopying: boolean;
  isTogglingEnabled: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCopyAndCount: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function SnippetPreview({
  snippet,
  isCopying,
  isTogglingEnabled,
  isDeleting,
  onEdit,
  onCopyAndCount,
  onToggleEnabled,
  onDelete,
}: SnippetPreviewProps) {
  if (!snippet) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="mb-4 size-12 rounded-xl bg-[var(--launcher-card-bg)] p-2.5">
          <FileText className="size-full text-[var(--icon-purple-fg)]" />
        </div>
        <p className="text-[13px] text-muted-foreground">Select a snippet to preview</p>
      </section>
    );
  }

  return (
    <section className="snippet-preview-enter flex min-h-0 flex-1 flex-col">
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {/* Snippet Content Card */}
        <article className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[var(--launcher-card-bg)] p-1">
              <FileText className="size-full text-[var(--icon-purple-fg)]" />
            </div>
            <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
              {snippet.name}
            </p>
            {!snippet.enabled && (
              <span className="rounded-full bg-[var(--icon-orange-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--icon-orange-fg)]">
                Disabled
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-muted-foreground">
            {snippet.template}
          </pre>
        </article>

        {/* Information Section */}
        <section className="mt-4 rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Information
            </span>
            <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
          </div>

          <dl className="space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Keyword</dt>
              <dd className="font-mono text-[var(--ring)]">{snippet.trigger}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {snippet.tags.length > 0 ? (
                  snippet.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Content Type</dt>
              <dd className="text-muted-foreground">{snippet.content_type}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Times Copied</dt>
              <dd className="text-muted-foreground">{snippet.copied_count}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Word Count</dt>
              <dd className="text-muted-foreground">{snippet.word_count}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Last Copied</dt>
              <dd className="text-muted-foreground">{formatDate(snippet.last_used_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Actions Footer */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopyAndCount}
          disabled={isCopying}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Copy className="size-3.5" />
          {isCopying ? "Pasting..." : "Paste"}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-3 text-[12px] font-medium transition-all duration-200",
              "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground",
            )}
          >
            <PenSquare className="size-3.5" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-2.5 text-[12px] font-medium transition-all duration-200",
                    "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground",
                  )}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-44">
              <DropdownMenuItem onClick={onToggleEnabled} disabled={isTogglingEnabled}>
                {snippet.enabled ? "Disable snippet" : "Enable snippet"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete} disabled={isDeleting}>
                <Trash2 className="size-3.5" />
                Delete snippet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  );
}
