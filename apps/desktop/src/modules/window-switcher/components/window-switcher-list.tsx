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
      <div className="windows-content-enter flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)]">
          <Focus className="size-5 text-muted-foreground" />
        </div>
        <p className="text-launcher-md font-medium tracking-[-0.01em] text-muted-foreground">
          No windows found
        </p>
        <p className="text-launcher-sm tracking-[-0.01em] text-muted-foreground">
          No windows match your current search.
        </p>
      </div>
    );
  }

  return (
    <div className="windows-content-enter custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {windows.map((windowEntry, index) => {
        const isSelected = selectedWindowId === windowEntry.id;

        return (
          <Button
            key={windowEntry.id}
            type="button"
            variant="ghost"
            className={cn(
              "windows-list-item group relative h-auto w-full items-start justify-start rounded-xl px-3 py-2.5 text-left transition-all",
              isSelected
                ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
                : "bg-transparent hover:bg-[var(--launcher-card-hover-bg)]",
            )}
            style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
            onClick={() => {
              onSelect(windowEntry.id);
            }}
            onDoubleClick={() => {
              onFocus(windowEntry.id);
            }}
            disabled={isBusy}
          >
            {/* Left accent bar */}
            <div
              className={cn(
                "absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--ring)] transition-all duration-200",
                isSelected && "h-8",
              )}
            />

            <div className="flex w-full items-center gap-3">
              {/* App Icon */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)]">
                <UnifiedIcon
                  icon={windowEntry.appIcon || "appwindowgrid2x2"}
                  className="size-5 text-muted-foreground"
                />
              </div>

              {/* Title & App Name */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-launcher-md font-medium tracking-[-0.01em] text-foreground">
                    {windowEntry.title || windowEntry.appName || "Untitled window"}
                  </span>
                  {windowEntry.isFocused && (
                    <span className="shrink-0 rounded-full bg-[var(--icon-green-bg)] px-2 py-0.5 text-launcher-2xs font-medium tracking-[-0.01em] text-[var(--icon-green-fg)]">
                      focused
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-launcher-xs tracking-[-0.01em] text-muted-foreground">
                  <span className="truncate">{windowEntry.appName || "Unknown app"}</span>
                  {windowEntry.workspace && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="shrink-0 font-mono text-launcher-2xs uppercase tracking-wide text-muted-foreground">
                        {windowEntry.workspace}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1 transition-opacity duration-150",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--ring)]/15 px-2.5 text-launcher-xs font-medium tracking-[-0.01em] text-[var(--ring)] transition-colors hover:bg-[var(--ring)]/25"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onFocus(windowEntry.id);
                  }}
                  disabled={isBusy}
                >
                  <Focus className="size-3.5" />
                  Focus
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="flex size-7 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-colors hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-fg)]"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose(windowEntry.id);
                  }}
                  disabled={isBusy}
                  aria-label="Close window"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
