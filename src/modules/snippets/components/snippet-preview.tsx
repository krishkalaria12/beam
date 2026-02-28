import { Copy, MoreHorizontal, PenSquare, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <section className="flex min-h-0 flex-1 items-center justify-center px-6 py-6 text-sm text-muted-foreground/70">
        Select a snippet to preview.
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <article className="rounded-xl border border-border/50 bg-background/20 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">{snippet.name}</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-6 text-foreground/95">
            {snippet.template}
          </pre>
        </article>

        <section className="mt-4 rounded-xl border border-border/50 bg-background/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Information
          </p>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border/35 pb-2">
              <dt className="text-muted-foreground/80">Label</dt>
              <dd className="text-foreground">{snippet.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/35 pb-2">
              <dt className="text-muted-foreground/80">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {snippet.tags.length > 0 ? (
                  snippet.tags.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      size="xs"
                      className="h-5 rounded-full px-2 text-[10px]"
                    >
                      {tag}
                    </Button>
                  ))
                ) : (
                  <span className="text-muted-foreground/70">None</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/35 pb-2">
              <dt className="text-muted-foreground/80">Content Type</dt>
              <dd className="text-foreground">{snippet.content_type}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/35 pb-2">
              <dt className="text-muted-foreground/80">Times Copied</dt>
              <dd className="text-foreground">{snippet.copied_count}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/35 pb-2">
              <dt className="text-muted-foreground/80">Word Count</dt>
              <dd className="text-foreground">{snippet.word_count}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground/80">Last Copied</dt>
              <dd className="text-foreground">{formatDate(snippet.last_used_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="sc-glass-footer flex h-[44px] shrink-0 items-center justify-between px-4 py-2">
        <Button
          type="button"
          size="sm"
          onClick={onCopyAndCount}
          disabled={isCopying}
          className="h-7 px-2.5"
        >
          <Copy className="size-3.5" />
          {isCopying ? "Copying" : "Paste"}
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit} className="h-7 px-2.5">
            <PenSquare className="size-3.5" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" size="sm" variant="outline" className="h-7 px-2" />}
            >
              <MoreHorizontal className="size-3.5" />
              Actions
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
