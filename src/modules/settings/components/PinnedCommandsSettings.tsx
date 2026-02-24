import { ArrowDown, ArrowUp, Pin, PinOff } from "lucide-react";
import { useMemo } from "react";

import { staticCommandRegistry } from "@/command-registry/registry";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

function getPinnedSubtitle(commandId: string): string {
  if (commandId.startsWith("applications.open.")) {
    return "Application command";
  }
  if (commandId.startsWith("quicklinks.execute")) {
    return "Quicklink command";
  }
  if (commandId.startsWith("extension.")) {
    return "Extension command";
  }
  if (commandId.startsWith("calculator.")) {
    return "Calculator command";
  }
  if (commandId.startsWith("system.")) {
    return "System command";
  }
  return "Custom command";
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

  if (pinnedCommands.length === 0) {
    return (
      <CommandGroup>
        <div className="px-4 py-6 text-xs text-muted-foreground">
          <div className="mb-1.5 flex items-center gap-2">
            <Pin className="size-3.5" />
            <span className="font-medium text-foreground">No pinned commands</span>
          </div>
          <p>Pin command items from the command UI to manage them here.</p>
        </div>
      </CommandGroup>
    );
  }

  return (
    <CommandGroup heading="Pinned Commands">
      {pinnedCommands.map((entry) => (
        <CommandItem
          key={entry.commandId}
          value={`pinned ${entry.commandId} ${entry.title} ${entry.subtitle}`}
        >
          <Pin className="size-5 text-primary/80" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-medium text-foreground">{entry.title}</p>
            <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>
          </div>
          <div className="ml-auto inline-flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMovePinned(entry.commandId, "up");
              }}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                "text-muted-foreground/70 hover:bg-muted/35 hover:text-foreground",
                !entry.canMoveUp && "pointer-events-none opacity-30",
              )}
              aria-label={`Move ${entry.title} up`}
              title="Move up"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMovePinned(entry.commandId, "down");
              }}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                "text-muted-foreground/70 hover:bg-muted/35 hover:text-foreground",
                !entry.canMoveDown && "pointer-events-none opacity-30",
              )}
              aria-label={`Move ${entry.title} down`}
              title="Move down"
            >
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSetPinned(entry.commandId, false);
              }}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                "text-muted-foreground/70 hover:bg-muted/35 hover:text-foreground",
              )}
              aria-label={`Unpin ${entry.title}`}
              title="Unpin"
            >
              <PinOff className="size-3.5" />
            </button>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
