import { ArrowDown, ArrowUp, GripVertical, Pin, PinOff } from "lucide-react";
import { useMemo } from "react";

import { staticCommandRegistry } from "@/command-registry/registry";
import { cn } from "@/lib/utils";

function getPinnedSubtitle(commandId: string): string {
  if (commandId.startsWith("applications.open.")) return "Application";
  if (commandId.startsWith("quicklinks.execute")) return "Quicklink";
  if (commandId.startsWith("extension.")) return "Extension";
  if (commandId.startsWith("calculator.")) return "Calculator";
  if (commandId.startsWith("system.")) return "System";
  return "Command";
}

interface PinnedCommandsSettingsProps {
  pinnedCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
}

export function PinnedCommandsSettings({
  pinnedCommandIds,
  onSetPinned,
  onMovePinned,
}: PinnedCommandsSettingsProps) {
  const pinnedCommands = useMemo(
    () =>
      pinnedCommandIds.map((commandId, index) => {
        const command = staticCommandRegistry.getById(commandId);
        return {
          commandId,
          title: command?.title ?? commandId,
          subtitle: command?.subtitle ?? getPinnedSubtitle(commandId),
          canMoveUp: index > 0,
          canMoveDown: index < pinnedCommandIds.length - 1,
        };
      }),
    [pinnedCommandIds],
  );

  return (
    <div className="settings-panel px-4 py-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Pinned Commands
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-[11px] text-white/35 tabular-nums">
          {pinnedCommands.length} {pinnedCommands.length === 1 ? "item" : "items"}
        </span>
      </div>

      {pinnedCommands.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl 
            bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-4"
          >
            <Pin className="size-6 text-amber-500/60" />
          </div>
          <p className="text-[14px] font-medium text-white/70 mb-1.5">No pinned commands</p>
          <p className="text-[12px] text-white/40 max-w-[220px] leading-relaxed">
            Pin commands from the main launcher to access them quickly
          </p>
        </div>
      ) : (
        // Pinned items list
        <div className="space-y-1.5">
          {pinnedCommands.map((entry, index) => (
            <div
              key={entry.commandId}
              className="pinned-item group flex items-center gap-3 px-3 py-3 rounded-xl
                bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Drag handle */}
              <div className="text-white/20 group-hover:text-white/40 transition-colors">
                <GripVertical className="size-4" />
              </div>

              {/* Order number */}
              <div
                className="flex size-7 items-center justify-center rounded-lg 
                bg-gradient-to-br from-amber-500/15 to-orange-500/15 
                text-[11px] font-bold text-amber-500/80 tabular-nums"
              >
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/90 truncate tracking-[-0.01em]">
                  {entry.title}
                </p>
                <p className="text-[11px] text-white/40 truncate">{entry.subtitle}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMovePinned(entry.commandId, "up");
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-all duration-150",
                    "text-white/40 hover:text-white hover:bg-white/10",
                    !entry.canMoveUp && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMovePinned(entry.commandId, "down");
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-all duration-150",
                    "text-white/40 hover:text-white hover:bg-white/10",
                    !entry.canMoveDown && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSetPinned(entry.commandId, false);
                  }}
                  className="flex size-8 items-center justify-center rounded-lg transition-all duration-150
                    text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
                  aria-label="Unpin"
                >
                  <PinOff className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint */}
      <p className="text-[12px] text-white/35 px-1 leading-relaxed">
        Pinned commands appear at the top of your launcher. Drag or use arrows to reorder.
      </p>
    </div>
  );
}
