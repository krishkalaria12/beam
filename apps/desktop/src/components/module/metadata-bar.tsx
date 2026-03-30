import type { CSSProperties, ReactNode } from "react";

import { openExternalUrl } from "@/lib/open-external-url";
import { cn } from "@/lib/utils";

type MetadataLabelItem = {
  type?: "label";
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  labelClassName?: string;
  valueClassName?: string;
  valueStyle?: CSSProperties;
};

type MetadataLinkItem = {
  type: "link";
  label: string;
  value: ReactNode;
  url: string;
  className?: string;
  style?: CSSProperties;
  labelClassName?: string;
  valueClassName?: string;
  valueStyle?: CSSProperties;
};

type MetadataTagsItem = {
  type: "tags";
  label: string;
  tags: Array<{
    text: ReactNode;
    icon?: ReactNode;
    color?: string;
  }>;
  className?: string;
  style?: CSSProperties;
  labelClassName?: string;
  tagsClassName?: string;
};

type MetadataSeparatorItem = {
  type: "separator";
};

export type MetadataBarItem =
  | MetadataLabelItem
  | MetadataLinkItem
  | MetadataTagsItem
  | MetadataSeparatorItem;

interface MetadataBarProps {
  items: MetadataBarItem[];
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  rowClassName?: string;
}

function getMetadataItemSignature(item: MetadataBarItem): string {
  if (item.type === "separator") {
    return "separator";
  }

  if (item.type === "tags") {
    return `tags:${item.label}:${item.tags.length}`;
  }

  return `${item.type ?? "label"}:${item.label}`;
}

function buildMetadataKeys(items: MetadataBarItem[]): string[] {
  const seenCounts = new Map<string, number>();

  return items.map((item) => {
    const signature = getMetadataItemSignature(item);
    const nextCount = (seenCounts.get(signature) ?? 0) + 1;
    seenCounts.set(signature, nextCount);
    return `${signature}:${nextCount}`;
  });
}

export function MetadataBar({
  items,
  className,
  style,
  contentClassName,
  contentStyle,
  rowClassName,
}: MetadataBarProps) {
  const itemKeys = buildMetadataKeys(items);

  return (
    <div
      className={cn(
        "module-metadata-bar custom-scrollbar min-h-0 overflow-y-auto overscroll-contain",
        className,
      )}
      style={style}
    >
      <div
        className={cn("module-metadata-content space-y-2 p-4", contentClassName)}
        style={contentStyle}
      >
        {items.map((item, index) => {
          const itemKey = itemKeys[index];

          if (item.type === "separator") {
            return (
              <div
                key={itemKey}
                className="module-metadata-separator my-1 h-px w-full bg-[var(--ui-divider)]"
              />
            );
          }

          const rowKeyBase = `${item.type}:${item.label}`;

          if (item.type === "tags") {
            return (
              <div
                key={itemKey}
                className={cn(
                  "metadata-row module-metadata-row flex items-start justify-between gap-4",
                  rowClassName,
                  item.className,
                )}
                style={item.style}
              >
                <span
                  className={cn(
                    "module-metadata-label text-launcher-sm text-muted-foreground",
                    item.labelClassName,
                  )}
                >
                  {item.label}
                </span>
                <div
                  className={cn(
                    "module-metadata-tags flex max-w-[68%] flex-wrap justify-end gap-1.5",
                    item.tagsClassName,
                  )}
                >
                  {item.tags.map((tag) => (
                    <span
                      key={`tag:${tag.text}:${tag.color ?? "default"}`}
                      className="module-metadata-tag inline-flex items-center gap-1 rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-launcher-xs text-muted-foreground"
                      style={tag.color ? { color: tag.color } : undefined}
                    >
                      {tag.icon ? <span className="[&_svg]:size-3.5">{tag.icon}</span> : null}
                      <span>{tag.text}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          const value =
            item.type === "link" ? (
              <button
                type="button"
                className={cn(
                  "module-metadata-value module-metadata-link",
                  "max-w-[68%] truncate text-right text-launcher-sm text-foreground underline-offset-4 hover:underline",
                  item.valueClassName,
                )}
                style={item.valueStyle}
                onClick={() => {
                  void openExternalUrl(item.url);
                }}
              >
                {item.value}
              </button>
            ) : (
              <div
                className={cn(
                  "module-metadata-value",
                  "flex max-w-[68%] items-center justify-end gap-1.5 text-right text-launcher-sm text-foreground",
                  item.valueClassName,
                )}
                style={item.valueStyle}
              >
                {item.icon ? <span className="[&_svg]:size-3.5">{item.icon}</span> : null}
                <span>{item.value}</span>
              </div>
            );

          return (
            <div
              key={itemKey}
              className={cn(
                "metadata-row module-metadata-row flex items-start justify-between gap-4",
                rowClassName,
                item.className,
              )}
              style={item.style}
            >
              <span
                className={cn(
                  "module-metadata-label text-launcher-sm text-muted-foreground",
                  item.labelClassName,
                )}
              >
                {item.label}
              </span>
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
