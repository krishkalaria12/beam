import { ArrowDown, ArrowUp, GripVertical, Pin, PinOff } from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { staticCommandRegistry } from "@/command-registry/registry";
import { cn } from "@/lib/utils";
import { SettingsSection, SettingsHint } from "../components/settings-field";

function getPinnedSubtitle(commandId: string): string {
  if (commandId.startsWith("applications.open.")) return "Application";
  if (commandId.startsWith("quicklinks.execute")) return "Quicklink";
  if (commandId.startsWith("extension.")) return "Extension";
  if (commandId.startsWith("calculator.")) return "Calculator";
  if (commandId.startsWith("system.")) return "System";
  return "Command";
}

interface GeneralPinnedCommandsSectionProps {
  pinnedCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
}

export function GeneralPinnedCommandsSection({
  pinnedCommandIds,
  onSetPinned,
  onMovePinned,
}: GeneralPinnedCommandsSectionProps) {
  const pinnedCommands = pinnedCommandIds.map((commandId, index) => {
    const command = staticCommandRegistry.getById(commandId);
    return {
      commandId,
      title: command?.title ?? commandId,
      subtitle: command?.subtitle ?? getPinnedSubtitle(commandId),
      canMoveUp: index > 0,
      canMoveDown: index < pinnedCommandIds.length - 1,
    };
  });

  return (
    <SettingsSection
      title="Pinned Commands"
      description="Commands pinned to the top of your launcher for quick access."
      icon={Pin}
      iconVariant="orange"
      headerAction={
        <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-0.5 text-launcher-2xs font-medium tabular-nums text-muted-foreground">
          {pinnedCommands.length} {pinnedCommands.length === 1 ? "item" : "items"}
        </span>
      }
    >
      {pinnedCommands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <IconChip variant="orange" size="lg" className="mb-4 size-12 rounded-2xl">
            <Pin className="size-5" />
          </IconChip>
          <p className="mb-1 text-launcher-sm font-medium text-muted-foreground">
            No pinned commands
          </p>
          <p className="max-w-[220px] text-launcher-xs leading-relaxed text-muted-foreground">
            Pin commands from the main launcher to access them quickly
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--launcher-card-border)]/60">
          {pinnedCommands.map((entry, index) => (
            <div
              key={entry.commandId}
              className="pinned-item group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[var(--launcher-card-bg)]/30"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Drag handle */}
              <div className="text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
                <GripVertical className="size-4" />
              </div>

              {/* Rank */}
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)] text-launcher-xs font-bold tabular-nums">
                {index + 1}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-launcher-sm font-medium tracking-[-0.01em] text-foreground">
                  {entry.title}
                </p>
                <p className="truncate text-launcher-xs text-muted-foreground">{entry.subtitle}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                    "size-7 rounded-lg transition-all duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-[var(--launcher-chip-bg)]",
                    !entry.canMoveUp && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" />
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
                    "size-7 rounded-lg transition-all duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-[var(--launcher-chip-bg)]",
                    !entry.canMoveDown && "pointer-events-none opacity-30",
                  )}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
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
                  className="size-7 rounded-lg text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Unpin"
                >
                  <PinOff className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SettingsHint>
        Drag or use arrows to reorder. Pinned items always appear at the top of results.
      </SettingsHint>
    </SettingsSection>
  );
}
