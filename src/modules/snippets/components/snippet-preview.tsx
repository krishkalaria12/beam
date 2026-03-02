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
        <p className="text-[13px] text-white/40">Select a snippet to preview</p>
      </section>
    );
  }

  return (
    <section className="snippet-preview-enter flex min-h-0 flex-1 flex-col">
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {/* Snippet Content Card */}
        <article className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-violet-500/25 to-purple-500/25 p-1">
              <FileText className="size-full text-violet-400" />
            </div>
            <p className="text-[13px] font-medium tracking-[-0.01em] text-white/90">
              {snippet.name}
            </p>
            {!snippet.enabled && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Disabled
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-white/75">
            {snippet.template}
          </pre>
        </article>

        {/* Information Section */}
        <section className="mt-4 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/[0.04]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
              Information
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <dl className="space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Keyword</dt>
              <dd className="font-mono text-[var(--solid-accent,#4ea2ff)]">{snippet.trigger}</dd>
            </div>
            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {snippet.tags.length > 0 ? (
                  snippet.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-white/30">None</span>
                )}
              </dd>
            </div>
            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Content Type</dt>
              <dd className="text-white/70">{snippet.content_type}</dd>
            </div>
            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Times Copied</dt>
              <dd className="text-white/70">{snippet.copied_count}</dd>
            </div>
            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Word Count</dt>
              <dd className="text-white/70">{snippet.word_count}</dd>
            </div>
            <div className="h-px bg-white/[0.04]" />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/40">Last Copied</dt>
              <dd className="text-white/70">{formatDate(snippet.last_used_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Actions Footer */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/[0.06] px-4">
        <button
          type="button"
          onClick={onCopyAndCount}
          disabled={isCopying}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)] hover:bg-[var(--solid-accent,#4ea2ff)]/30",
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
              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-[12px] font-medium transition-all duration-200",
              "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
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
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[12px] font-medium transition-all duration-200",
                    "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
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
