import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandShortcut } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CommandDescriptor } from "@/command-registry/types";
import { RegistryCommandIcon } from "@/command-registry/components/registry-command-icon";
import { useAwakeStore } from "@/modules/system-actions/store/awake-store";

interface RegistryCommandRowProps {
  command: CommandDescriptor;
  isDisabled: boolean;
  onSelect: (commandId: string) => void;
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
  compact = false,
}: RegistryCommandRowProps) {
  const isAwakeCommand = command.id === "system.awake";
  const endSlot = compact
    ? (
      <div className="ml-auto flex items-center gap-4">
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
      </div>
    )
    : isAwakeCommand
    ? (
      <CommandShortcut className="normal-case tracking-[0.08em] text-[11px]">
        <AwakeStatusText />
      </CommandShortcut>
    )
    : command.endText
    ? (
      <CommandShortcut className="normal-case tracking-[0.08em] text-[11px]">
        {command.endText}
      </CommandShortcut>
    )
    : null;

  return (
    <BaseCommandRow
      value={`${command.id} ${command.title} ${command.keywords.join(" ")}`}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onSelect(command.id);
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
