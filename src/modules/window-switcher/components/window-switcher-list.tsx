import { Focus, X } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
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
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/[0.04]">
          <Focus className="size-5 text-white/30" />
        </div>
        <p className="text-[13px] font-medium tracking-[-0.01em] text-white/50">No windows found</p>
        <p className="text-[12px] tracking-[-0.01em] text-white/35">
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
          <button
            key={windowEntry.id}
            type="button"
            className={cn(
              "windows-list-item group relative rounded-xl px-3 py-2.5 text-left transition-all",
              isSelected
                ? "bg-white/[0.06] ring-1 ring-white/20"
                : "bg-transparent hover:bg-white/[0.04]",
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
                "absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--solid-accent,#4ea2ff)] transition-all duration-200",
                isSelected && "h-8",
              )}
            />

            <div className="flex items-center gap-3">
              {/* App Icon */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                <UnifiedIcon
                  icon={windowEntry.appIcon || "appwindowgrid2x2"}
                  className="size-5 text-white/60"
                />
              </div>

              {/* Title & App Name */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium tracking-[-0.01em] text-white/85">
                    {windowEntry.title || windowEntry.appName || "Untitled window"}
                  </span>
                  {windowEntry.isFocused && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium tracking-[-0.01em] text-emerald-400">
                      focused
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] tracking-[-0.01em] text-white/40">
                  <span className="truncate">{windowEntry.appName || "Unknown app"}</span>
                  {windowEntry.workspace && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-white/30">
                        {windowEntry.workspace}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className={cn(
                  "flex items-center gap-1 transition-opacity duration-150",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <button
                  type="button"
                  className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--solid-accent,#4ea2ff)]/15 px-2.5 text-[11px] font-medium tracking-[-0.01em] text-[var(--solid-accent,#4ea2ff)] transition-colors hover:bg-[var(--solid-accent,#4ea2ff)]/25"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onFocus(windowEntry.id);
                  }}
                  disabled={isBusy}
                >
                  <Focus className="size-3.5" />
                  Focus
                </button>

                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose(windowEntry.id);
                  }}
                  disabled={isBusy}
                  aria-label="Close window"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
