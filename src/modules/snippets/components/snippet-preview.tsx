import { Copy, FileText, MoreHorizontal, PenSquare, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <div className="mb-4 size-12 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 p-2.5">
          <FileText className="size-full text-violet-400/40" />
        </div>
        <p className="text-[13px] text-foreground/40">Select a snippet to preview</p>
      </section>
    );
  }

  return (
    <section className="snippet-preview-enter flex min-h-0 flex-1 flex-col">
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {/* Snippet Content Card */}
        <article className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-violet-500/25 to-purple-500/25 p-1">
              <FileText className="size-full text-violet-400" />
            </div>
            <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground/90">
              {snippet.name}
            </p>
            {!snippet.enabled && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Disabled
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground/75">
            {snippet.template}
          </pre>
        </article>

        {/* Information Section */}
        <section className="mt-4 rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
              Information
            </span>
            <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
          </div>

          <dl className="space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Keyword</dt>
              <dd className="font-mono text-[var(--ring)]">{snippet.trigger}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {snippet.tags.length > 0 ? (
                  snippet.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-foreground/60"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-foreground/30">None</span>
                )}
              </dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Content Type</dt>
              <dd className="text-foreground/70">{snippet.content_type}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Times Copied</dt>
              <dd className="text-foreground/70">{snippet.copied_count}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Word Count</dt>
              <dd className="text-foreground/70">{snippet.word_count}</dd>
            </div>
            <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-foreground/40">Last Copied</dt>
              <dd className="text-foreground/70">{formatDate(snippet.last_used_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Actions Footer */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4">
        <button
          type="button"
          onClick={onCopyAndCount}
          disabled={isCopying}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Copy className="size-3.5" />
          {isCopying ? "Copying..." : "Paste"}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-3 text-[12px] font-medium transition-all duration-200",
              "bg-[var(--launcher-card-bg)] text-foreground/60 hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/80",
            )}
          >
            <PenSquare className="size-3.5" />
            Edit
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-2.5 text-[12px] font-medium transition-all duration-200",
                    "bg-[var(--launcher-card-bg)] text-foreground/60 hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/80",
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
