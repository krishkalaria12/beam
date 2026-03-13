import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { EmptyView } from "./empty-view";
import { MarkdownView } from "./markdown-view";
import { MetadataBar, type MetadataBarItem } from "./metadata-bar";
import { SplitView } from "./split-view";

interface DetailViewProps {
  markdown?: string;
  metadata?: MetadataBarItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  contentClassName?: string;
  metadataClassName?: string;
  markdownClassName?: string;
  emptyState?: ReactNode;
}

export function DetailView({
  markdown,
  metadata = [],
  emptyTitle = "No detail available",
  emptyDescription,
  className,
  contentClassName,
  metadataClassName,
  markdownClassName,
  emptyState,
}: DetailViewProps) {
  const normalizedMarkdown = markdown?.trim() ?? "";
  const hasMarkdown = normalizedMarkdown.length > 0;
  const hasMetadata = metadata.length > 0;

  if (!hasMarkdown && !hasMetadata) {
    return (
      <div className={cn("min-h-0 flex-1", className)}>
        {emptyState ?? <EmptyView title={emptyTitle} description={emptyDescription} />}
      </div>
    );
  }

  if (hasMarkdown && hasMetadata) {
    return (
      <SplitView
        detailVisible
        detailRatio="40%"
        className={className}
        primaryClassName={cn("overflow-y-auto", contentClassName)}
        detailClassName={cn("overflow-y-auto bg-[var(--launcher-card-bg)]", metadataClassName)}
        primary={
          <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
            <MarkdownView className={markdownClassName}>{normalizedMarkdown}</MarkdownView>
          </div>
        }
        detail={
          <div className="h-full rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
            <MetadataBar items={metadata} />
          </div>
        }
      />
    );
  }

  if (hasMarkdown) {
    return (
      <div className={cn("min-h-0 flex-1 overflow-y-auto", className, contentClassName)}>
        <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
          <MarkdownView className={markdownClassName}>{normalizedMarkdown}</MarkdownView>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", className, metadataClassName)}>
      <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
        <MetadataBar items={metadata} />
      </div>
    </div>
  );
}
