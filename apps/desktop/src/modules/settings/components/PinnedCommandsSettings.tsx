import { ArrowDown, ArrowUp, GripVertical, Pin, PinOff } from "lucide-react";
import { useMemo } from "react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Pinned Commands
        </span>
        <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {pinnedCommands.length} {pinnedCommands.length === 1 ? "item" : "items"}
        </span>
      </div>

      {pinnedCommands.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <IconChip variant="orange" size="lg" className="mb-4 size-14 rounded-2xl">
            <Pin className="size-6" />
          </IconChip>
          <p className="mb-1.5 text-[14px] font-medium text-muted-foreground">No pinned commands</p>
          <p className="max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
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
                bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)] transition-all duration-200"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Drag handle */}
              <div className="text-muted-foreground transition-colors group-hover:text-foreground">
                <GripVertical className="size-4" />
              </div>

              {/* Order number */}
              <div
                className="flex size-7 items-center justify-center rounded-lg 
                bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)]
                text-[11px] font-bold tabular-nums"
              >
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium tracking-[-0.01em] text-foreground">
                  {entry.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{entry.subtitle}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
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
                    "size-8 rounded-lg transition-all duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-[var(--launcher-chip-bg)]",
                    !entry.canMoveUp && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
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
                    "size-8 rounded-lg transition-all duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-[var(--launcher-chip-bg)]",
                    !entry.canMoveDown && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSetPinned(entry.commandId, false);
                  }}
                  className="size-8 rounded-lg transition-all duration-150 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="Unpin"
                >
                  <PinOff className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hint */}
      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Pinned commands appear at the top of your launcher. Drag or use arrows to reorder.
      </p>
    </div>
  );
}
