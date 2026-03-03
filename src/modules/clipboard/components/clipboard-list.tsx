import { FileText, ImageIcon, Link, Clipboard } from "lucide-react";
import { memo, useMemo } from "react";
import { isToday, isYesterday, parseISO, format } from "date-fns";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import { cn } from "@/lib/utils";
import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";

interface ClipboardListItemProps {
  entry: ClipboardHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
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

const ClipboardListItem = memo(function ClipboardListItem({
  entry,
  isSelected,
  onSelect,
  index,
}: ClipboardListItemProps) {
  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(index * 20, 150)}ms` }}
      className={cn(
        "clipboard-list-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200",
        isSelected
          ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]",
      )}
    >
      {/* Left accent bar on hover/selected */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200",
          iconConfig.accentColor,
          isSelected
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-50 group-hover:opacity-60 group-hover:scale-y-75",
        )}
      />

      {/* Icon with gradient background */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-center size-9 rounded-xl bg-[var(--launcher-card-bg)] transition-all duration-200",
          iconConfig.gradient,
          isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-muted-foreground",
        )}
      >
        {iconConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate text-[13px] font-medium leading-tight tracking-[-0.01em] transition-colors",
            isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {entry.content_type === ClipboardContentType.Image
            ? "Image"
            : entry.value.replace(/\s+/g, " ").trim()}
        </p>
        {entry.content_type !== ClipboardContentType.Image && (
          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {entry.character_count} characters
          </p>
        )}
      </div>
    </div>
  );
});

interface ClipboardListProps {
  entries: ClipboardHistoryEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
}

export function ClipboardList({ entries, selectedIndex, onSelect, isLoading }: ClipboardListProps) {
  const groupedEntries = useMemo(() => {
    const groups: {
      title: string;
      items: { entry: ClipboardHistoryEntry; originalIndex: number }[];
    }[] = [];

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

      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, items: [] };
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
            <CommandLoadingState label="Loading history..." />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
              <Clipboard className="size-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-muted-foreground">No entries found</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Copy something to see it here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedEntries.map((group, groupIndex) => (
              <div key={group.title} className="space-y-1.5">
                {/* Section header */}
                <div
                  className="clipboard-section-header flex items-center gap-3 px-3 py-1"
                  style={{ animationDelay: `${groupIndex * 50}ms` }}
                >
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
                </div>

                {/* Items */}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <ClipboardListItem
                      key={item.originalIndex}
                      entry={item.entry}
                      isSelected={item.originalIndex === selectedIndex}
                      onSelect={() => onSelect(item.originalIndex)}
                      index={item.originalIndex}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
