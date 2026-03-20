import { FileText, ImageIcon, Link, Clipboard } from "lucide-react";
import { useMemo } from "react";
import { isToday, isYesterday, parseISO, format } from "date-fns";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import { cn } from "@/lib/utils";
import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";

interface ClipboardListItemProps {
  entry: ClipboardHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  itemRef?: (node: HTMLDivElement | null) => void;
}

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

function ClipboardListItem({ entry, isSelected, onSelect, itemRef }: ClipboardListItemProps) {
  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div
      ref={itemRef}
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
        "group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        "[content-visibility:auto] [contain-intrinsic-size:56px]",
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

  return (
    <div className="clipboard-list-panel flex w-[42%] flex-col border-r border-[var(--launcher-card-border)]">
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
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
          <div className="w-full">
            {groupedEntries.map((group) => (
              <div key={`group-${group.title}`}>
                <div className="flex items-center gap-3 px-3 py-1">
                  <h3 className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
                </div>
                {group.items.map((item) => (
                  <ClipboardListItem
                    key={`item-${item.entry.copied_at}-${item.entry.content_type}-${item.entry.value.slice(0, 20)}`}
                    entry={item.entry}
                    isSelected={item.originalIndex === selectedIndex}
                    onSelect={() => onSelect(item.originalIndex)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
