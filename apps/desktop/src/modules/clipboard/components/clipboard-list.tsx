import { FileText, ImageIcon, Link, Clipboard } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { isToday, isYesterday, parseISO, format } from "date-fns";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import { cn } from "@/lib/utils";
import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";

interface ClipboardListItemProps {
  entry: ClipboardHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
}

const CLIPBOARD_HEADER_HEIGHT = 32;
const CLIPBOARD_ITEM_HEIGHT = 62;

type ClipboardVirtualRow =
  | {
      key: string;
      type: "header";
      title: string;
    }
  | {
      key: string;
      type: "item";
      entry: ClipboardHistoryEntry;
      originalIndex: number;
    };

const getEntryIconConfig = (type: ClipboardContentType) => {
  switch (type) {
    case ClipboardContentType.Image:
      return {
        icon: <ImageIcon className="size-4" />,
        gradient: "bg-[var(--icon-orange-bg)]",
        accentColor: "bg-[var(--icon-orange-bg)]",
      };
    case ClipboardContentType.Link:
      return {
        icon: <Link className="size-4" />,
        gradient: "bg-[var(--icon-green-bg)]",
        accentColor: "bg-[var(--icon-green-bg)]",
      };
    default:
      return {
        icon: <FileText className="size-4" />,
        gradient: "bg-[var(--icon-primary-bg)]",
        accentColor: "bg-[var(--icon-primary-bg)]",
      };
  }
};

function ClipboardListItem({ entry, isSelected, onSelect }: ClipboardListItemProps) {
  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex h-[62px] cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors",
        isSelected
          ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]",
      )}
    >
      {/* Left accent bar on hover/selected */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all",
          iconConfig.accentColor,
          isSelected
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-50 group-hover:opacity-60 group-hover:scale-y-75",
        )}
      />

      {/* Icon with gradient background */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)] transition-colors",
          iconConfig.gradient,
          isSelected
            ? "text-foreground"
            : "text-muted-foreground group-hover:text-muted-foreground",
        )}
      >
        {iconConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate text-launcher-md font-medium leading-tight tracking-[-0.01em]",
            isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {entry.content_type === ClipboardContentType.Image
            ? "Image"
            : entry.value.replace(/\s+/g, " ").trim()}
        </p>
        {entry.content_type !== ClipboardContentType.Image && (
          <p className="mt-0.5 text-launcher-xs text-muted-foreground truncate">
            {entry.character_count} characters
          </p>
        )}
      </div>
    </div>
  );
}

interface ClipboardListProps {
  entries: ClipboardHistoryEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
}

export function ClipboardList({ entries, selectedIndex, onSelect, isLoading }: ClipboardListProps) {
  "use no memo";

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const groupedEntries = useMemo(() => {
    const groups: Array<{
      title: string;
      items: { entry: ClipboardHistoryEntry; originalIndex: number }[];
    }> = [];
    const groupByTitle = new Map<
      string,
      {
        title: string;
        items: { entry: ClipboardHistoryEntry; originalIndex: number }[];
      }
    >();

    entries.forEach((entry, index) => {
      const date = parseISO(entry.copied_at);
      let title = "Earlier";

      if (isToday(date)) {
        title = "Today";
      } else if (isYesterday(date)) {
        title = "Yesterday";
      } else {
        title = format(date, "MMMM d, yyyy");
      }

      let group = groupByTitle.get(title);
      if (!group) {
        group = { title, items: [] };
        groupByTitle.set(title, group);
        groups.push(group);
      }
      group.items.push({ entry, originalIndex: index });
    });

    return groups;
  }, [entries]);
  const rows = useMemo<ClipboardVirtualRow[]>(() => {
    const nextRows: ClipboardVirtualRow[] = [];

    for (const group of groupedEntries) {
      nextRows.push({
        key: `group-${group.title}`,
        type: "header",
        title: group.title,
      });

      for (const item of group.items) {
        nextRows.push({
          key: `item-${item.entry.copied_at}-${item.entry.content_type}-${item.entry.value.slice(0, 20)}`,
          type: "item",
          entry: item.entry,
          originalIndex: item.originalIndex,
        });
      }
    }

    return nextRows;
  }, [groupedEntries]);

  useLayoutEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.debug(
      "[ClipboardList] entries",
      entries.map((entry, index) => ({
        index,
        copiedAt: entry.copied_at,
        type: entry.content_type,
        characters: entry.character_count,
        preview:
          entry.content_type === ClipboardContentType.Image
            ? "Image"
            : entry.value.replace(/\s+/g, " ").trim().slice(0, 80),
      })),
    );
    console.debug(
      "[ClipboardList] rows",
      rows.map((row, index) => ({
        index,
        key: row.key,
        type: row.type,
        title: row.type === "header" ? row.title : undefined,
        originalIndex: row.type === "item" ? row.originalIndex : undefined,
      })),
    );
  }, [entries, rows]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    getItemKey: (index) => rows[index]?.key ?? index,
    estimateSize: (index) =>
      rows[index]?.type === "header" ? CLIPBOARD_HEADER_HEIGHT : CLIPBOARD_ITEM_HEIGHT,
    debug: import.meta.env.DEV,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useLayoutEffect(() => {
    if (entries.length === 0) {
      return;
    }

    const selectedRowIndex = rows.findIndex(
      (row) => row.type === "item" && row.originalIndex === selectedIndex,
    );
    if (selectedRowIndex < 0) {
      return;
    }

    rowVirtualizer.scrollToIndex(selectedRowIndex, { align: "auto" });
  }, [entries.length, rowVirtualizer, rows, selectedIndex]);

  return (
    <div className="clipboard-list-panel flex w-[42%] flex-col border-r border-[var(--launcher-card-border)]">
      <div ref={scrollContainerRef} className="custom-scrollbar flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <CommandLoadingState label="Loading history..." withSpinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
              <Clipboard className="size-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-launcher-md font-medium text-muted-foreground">No entries found</p>
              <p className="mt-1 text-launcher-xs text-muted-foreground">
                Copy something to see it here
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) {
                return null;
              }

              return (
                <div
                  key={row.key}
                  data-index={virtualRow.index}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.type === "header" ? (
                    <div className="flex h-8 items-center gap-3 px-3">
                      <h3 className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {row.title}
                      </h3>
                      <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
                    </div>
                  ) : (
                    <ClipboardListItem
                      entry={row.entry}
                      isSelected={row.originalIndex === selectedIndex}
                      onSelect={() => onSelect(row.originalIndex)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
