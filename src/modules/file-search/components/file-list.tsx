import { File, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "../types";

interface FileListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
  onOpen: (path: string) => void;
}

export function FileList({ results, selectedIndex, onSelect, isLoading, onOpen }: FileListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.children[selectedIndex + 1] as HTMLElement; // +1 for the header
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (isLoading && results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">No matching files found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2" ref={listRef}>
      <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">Files</div>
      <div className="space-y-0.5">
        {results.map((result, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={result.entry.path}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                isSelected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => onSelect(index)}
              onDoubleClick={() => onOpen(result.entry.path)}
            >
              <div className={cn(
                "flex size-8 items-center justify-center rounded bg-background shadow-sm ring-1 ring-border/50",
                isSelected ? "ring-accent-foreground/10" : ""
              )}>
                 <File className="size-4 opacity-70" />
              </div>
              
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("truncate font-medium", isSelected ? "text-foreground" : "text-foreground/80")}>
                  {result.entry.name}
                </span>
                <span className="truncate text-xs opacity-60">
                   {result.entry.path}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
