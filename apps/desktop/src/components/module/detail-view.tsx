import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { EmptyView } from "./empty-view";
import { MarkdownView } from "./markdown-view";
import { MetadataBar, type MetadataBarItem } from "./metadata-bar";
import { SplitView } from "./split-view";

const EMPTY_METADATA: MetadataBarItem[] = [];

interface DetailViewProps {
  markdown?: string;
  metadata?: MetadataBarItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  metadataClassName?: string;
  metadataStyle?: CSSProperties;
  markdownClassName?: string;
  emptyState?: ReactNode;
}

export function DetailView({
  markdown,
  metadata = EMPTY_METADATA,
  emptyTitle = "No detail available",
  emptyDescription,
  className,
  style,
  contentClassName,
  contentStyle,
  metadataClassName,
  metadataStyle,
  markdownClassName,
  emptyState,
}: DetailViewProps) {
  const normalizedMarkdown = markdown?.trim() ?? "";
  const hasMarkdown = normalizedMarkdown.length > 0;
  const hasMetadata = metadata.length > 0;

  if (!hasMarkdown && !hasMetadata) {
    return (
      <div
        className={cn("module-detail-view min-h-0 flex-1 overflow-hidden", className)}
        style={style}
      >
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
        style={style}
        primaryClassName={cn(
          "module-detail-content",
          "custom-scrollbar h-full overflow-y-auto overscroll-contain",
          contentClassName,
        )}
        primaryStyle={contentStyle}
        detailClassName={cn(
          "module-detail-metadata",
          "custom-scrollbar h-full overflow-y-auto overscroll-contain bg-[var(--launcher-card-bg)]",
          metadataClassName,
        )}
        detailStyle={metadataStyle}
        primary={
          <div className="module-detail-markdown-panel min-h-full rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
            <MarkdownView className={markdownClassName}>{normalizedMarkdown}</MarkdownView>
          </div>
        }
        detail={
          <div className="module-detail-metadata-panel min-h-full rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
            <MetadataBar items={metadata} />
          </div>
        }
      />
    );
  }

  if (hasMarkdown) {
    return (
      <div
        className={cn(
          "module-detail-content",
          "custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",
          className,
          contentClassName,
        )}
        style={{ ...style, ...contentStyle }}
      >
        <div className="module-detail-markdown-panel rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
          <MarkdownView className={markdownClassName}>{normalizedMarkdown}</MarkdownView>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "module-detail-metadata",
        "custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className,
        metadataClassName,
      )}
      style={{ ...style, ...metadataStyle }}
    >
      <div className="module-detail-metadata-panel rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
        <MetadataBar items={metadata} />
      </div>
    </div>
  );
}
