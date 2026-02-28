import { Focus, X } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WindowEntry } from "@/modules/window-switcher/types";

interface WindowSwitcherListProps {
  windows: readonly WindowEntry[];
  selectedWindowId: string | null;
  isBusy: boolean;
  onSelect: (windowId: string) => void;
  onFocus: (windowId: string) => void;
  onClose: (windowId: string) => void;
}

export function WindowSwitcherList({
  windows,
  selectedWindowId,
  isBusy,
  onSelect,
  onFocus,
  onClose,
}: WindowSwitcherListProps) {
  if (windows.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No windows match your current search.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex h-full flex-col overflow-y-auto p-2">
      {windows.map((windowEntry) => {
        const isSelected = selectedWindowId === windowEntry.id;

        return (
          <button
            key={windowEntry.id}
            type="button"
            className={cn(
              "group mb-1 rounded-md border px-2.5 py-2 text-left transition-colors",
              isSelected
                ? "border-primary/40 bg-primary/10"
                : "border-transparent bg-transparent hover:border-border/50 hover:bg-background/30",
            )}
            onClick={() => {
              onSelect(windowEntry.id);
            }}
            onDoubleClick={() => {
              onFocus(windowEntry.id);
            }}
            disabled={isBusy}
          >
            <div className="flex items-center gap-2">
              <UnifiedIcon
                icon={windowEntry.appIcon || "appwindowgrid2x2"}
                className="size-4 shrink-0"
              />
              <span className="truncate text-sm font-medium text-foreground">
                {windowEntry.title || windowEntry.appName || "Untitled window"}
              </span>
              {windowEntry.isFocused ? (
                <span className="ml-auto rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  focused
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{windowEntry.appName || "Unknown app"}</span>
              {windowEntry.workspace ? (
                <span className="rounded-sm border border-border/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                  {windowEntry.workspace}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[10px]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFocus(windowEntry.id);
                }}
                disabled={isBusy}
              >
                <Focus className="size-3" />
                Focus
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClose(windowEntry.id);
                }}
                disabled={isBusy}
              >
                <X className="size-3" />
                Close
              </Button>
            </div>
          </button>
        );
      })}
    </div>
  );
}
