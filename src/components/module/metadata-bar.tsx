import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetadataLabelItem = {
  type?: "label";
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  valueClassName?: string;
};

type MetadataLinkItem = {
  type: "link";
  label: string;
  value: ReactNode;
  url: string;
};

type MetadataTagsItem = {
  type: "tags";
  label: string;
  tags: Array<{
    text: ReactNode;
    icon?: ReactNode;
    color?: string;
  }>;
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
  contentClassName?: string;
  rowClassName?: string;
}

export function MetadataBar({
  items,
  className,
  contentClassName,
  rowClassName,
}: MetadataBarProps) {
  return (
    <div className={cn("min-h-0 overflow-y-auto", className)}>
      <div className={cn("space-y-2 p-4", contentClassName)}>
        {items.map((item, index) => {
          if (item.type === "separator") {
            return (
              <div key={`separator:${index}`} className="my-1 h-px w-full bg-[var(--ui-divider)]" />
            );
          }

          if (item.type === "tags") {
            return (
              <div
                key={`tags:${item.label}:${index}`}
                className={cn("flex items-start justify-between gap-4", rowClassName)}
              >
                <span className="text-[12px] text-muted-foreground">{item.label}</span>
                <div className="flex max-w-[68%] flex-wrap justify-end gap-1.5">
                  {item.tags.map((tag, tagIndex) => (
                    <span
                      key={`tag:${index}:${tagIndex}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-[11px] text-muted-foreground"
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
                className="max-w-[68%] truncate text-right text-[12px] text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  window.open(item.url, "_blank", "noopener,noreferrer");
                }}
              >
                {item.value}
              </button>
            ) : (
              <div
                className={cn(
                  "flex max-w-[68%] items-center justify-end gap-1.5 text-right text-[12px] text-foreground",
                  item.valueClassName,
                )}
              >
                {item.icon ? <span className="[&_svg]:size-3.5">{item.icon}</span> : null}
                <span>{item.value}</span>
              </div>
            );

          return (
            <div
              key={`${item.type ?? "label"}:${item.label}:${index}`}
              className={cn("flex items-start justify-between gap-4", rowClassName)}
            >
              <span className="text-[12px] text-muted-foreground">{item.label}</span>
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
