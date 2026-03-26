import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandShortcut } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CommandDescriptor } from "@/command-registry/types";
import { RegistryCommandIcon } from "@/command-registry/components/registry-command-icon";
import { useAwakeStore } from "@/modules/system-actions/store/awake-store";
import { Pin, PinOff } from "lucide-react";

interface RegistryCommandRowProps {
  command: CommandDescriptor;
  isDisabled: boolean;
  onSelect: (commandId: string) => void;
  onIntent: (command: CommandDescriptor) => void;
  isPinned: boolean;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  compact?: boolean;
}

function AwakeStatusText() {
  const isAwake = useAwakeStore((state) => state.isAwake);
  const isLoading = useAwakeStore((state) => state.isLoading);

  if (isLoading) {
    return "loading";
  }

  return isAwake ? "on" : "off";
}

export function RegistryCommandRow({
  command,
  isDisabled,
  onSelect,
  onIntent,
  isPinned,
  onSetPinned,
  compact = false,
}: RegistryCommandRowProps) {
  const isAwakeCommand = command.id === "system.awake";

  const detailsSlot = compact ? (
    <>
      {command.subtitle ? (
        <span className="text-xs text-muted-foreground/70">{command.subtitle}</span>
      ) : null}
      {isAwakeCommand ? (
        <span className="text-xs text-muted-foreground/55">
          <AwakeStatusText />
        </span>
      ) : command.endText ? (
        <span className="text-xs text-muted-foreground/55">{command.endText}</span>
      ) : null}
    </>
  ) : isAwakeCommand ? (
    <CommandShortcut className="normal-case tracking-[0.08em]">
      <AwakeStatusText />
    </CommandShortcut>
  ) : command.endText ? (
    <CommandShortcut className="normal-case tracking-[0.08em]">{command.endText}</CommandShortcut>
  ) : null;

  const pinButton = (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSetPinned(command.id, !isPinned);
      }}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors",
        "text-muted-foreground/70 hover:bg-muted/35 hover:text-foreground",
      )}
      aria-label={isPinned ? `Unpin ${command.title}` : `Pin ${command.title}`}
      title={isPinned ? "Unpin command" : "Pin command"}
    >
      {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
    </button>
  );

  const endSlot = (
    <div className={cn("ml-auto flex items-center", compact ? "gap-4" : "gap-2")}>
      {detailsSlot}
      {pinButton}
    </div>
  );

  return (
    <BaseCommandRow
      value={`${command.id} ${command.title} ${command.keywords.join(" ")}`}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onSelect(command.id);
      }}
      onPointerEnter={() => {
        onIntent(command);
      }}
      onFocus={() => {
        onIntent(command);
      }}
      icon={<RegistryCommandIcon command={command} />}
      title={command.title}
      titleClassName="truncate text-foreground capitalize"
      subtitle={!compact ? command.subtitle : undefined}
      subtitleClassName="truncate text-xs text-muted-foreground"
      endSlot={endSlot}
      className={cn(compact ? "py-2.5 [&>svg:last-child]:hidden" : undefined)}
    />
  );
}
