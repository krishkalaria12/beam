import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CommandDescriptor } from "@/command-registry/types";
import { RegistryCommandIcon } from "@/command-registry/components/registry-command-icon";

interface RegistryCommandRowProps {
  command: CommandDescriptor;
  isDisabled: boolean;
  onSelect: (commandId: string) => void;
  compact?: boolean;
}

export function RegistryCommandRow({
  command,
  isDisabled,
  onSelect,
  compact = false,
}: RegistryCommandRowProps) {
  return (
    <CommandItem
      key={command.id}
      value={`${command.id} ${command.title} ${command.keywords.join(" ")}`}
      disabled={isDisabled}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onSelect(command.id);
      }}
      className={cn(compact ? "py-2.5 [&>svg:last-child]:hidden" : undefined)}
    >
      <RegistryCommandIcon command={command} />
      <div className="min-w-0">
        <p className="truncate text-foreground capitalize">{command.title}</p>
        {!compact && command.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{command.subtitle}</p>
        ) : null}
      </div>
      {compact ? (
        <div className="ml-auto flex items-center gap-4">
          {command.subtitle ? (
            <span className="text-xs text-muted-foreground/70">{command.subtitle}</span>
          ) : null}
          {command.endText ? (
            <span className="text-xs text-muted-foreground/55">{command.endText}</span>
          ) : null}
        </div>
      ) : (
        <>
          {command.endText ? (
            <CommandShortcut className="normal-case tracking-[0.08em] text-[11px]">
              {command.endText}
            </CommandShortcut>
          ) : null}
        </>
      )}
    </CommandItem>
  );
}
