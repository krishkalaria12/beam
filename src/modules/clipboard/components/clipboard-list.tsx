import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";
import { cn } from "@/lib/utils";
import { FileText, ImageIcon, Link } from "lucide-react";
import { memo, useMemo } from "react";
import { isToday, isYesterday, parseISO, format } from "date-fns";

interface ClipboardListItemProps {
  entry: ClipboardHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
}

const getEntryIcon = (type: ClipboardContentType) => {
  switch (type) {
    case ClipboardContentType.Image:
      return <ImageIcon className="size-4" />;
    case ClipboardContentType.Link:
      return <Link className="size-4" />;
    default:
      return <FileText className="size-4" />;
  }
};

const ClipboardListItem = memo(function ClipboardListItem({
  entry,
  isSelected,
  onSelect,
}: ClipboardListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all",
        isSelected
          ? "bg-foreground/10 text-foreground shadow-sm"
          : "text-muted-foreground/80 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <div
        className={cn(
          "shrink-0 flex items-center justify-center size-8 rounded-md bg-foreground/5 transition-colors",
          isSelected ? "bg-foreground/10 text-foreground" : "text-muted-foreground/60 group-hover:text-foreground/80",
        )}
      >
        {getEntryIcon(entry.content_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium leading-tight">
          {entry.content_type === ClipboardContentType.Image
            ? "Image"
            : entry.value.replace(/\s+/g, " ").trim()}
        </p>
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

export function ClipboardList({
  entries,
  selectedIndex,
  onSelect,
  isLoading,
}: ClipboardListProps) {
  const groupedEntries = useMemo(() => {
    const groups: { title: string; items: { entry: ClipboardHistoryEntry; originalIndex: number }[] }[] = [];
    
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
      
      let group = groups.find(g => g.title === title);
      if (!group) {
        group = { title, items: [] };
        groups.push(group);
      }
      group.items.push({ entry, originalIndex: index });
    });
    
    return groups;
  }, [entries]);

  return (
    <div className="w-[40%] border-r border-border/40 bg-background/30 flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 scrollbar-none">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
            Loading history...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground/60 flex flex-col items-center gap-2">
            <div className="size-10 rounded-full bg-muted/20 flex items-center justify-center">
                <FileText className="size-5 opacity-40" />
            </div>
            <span>No entries found</span>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEntries.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <ClipboardListItem
                      key={item.originalIndex}
                      entry={item.entry}
                      isSelected={item.originalIndex === selectedIndex}
                      onSelect={() => onSelect(item.originalIndex)}
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
