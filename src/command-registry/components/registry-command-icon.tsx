import type { CommandDescriptor } from "@/command-registry/types";
import { CommandIcon } from "@/components/icons/command-icon";

export function RegistryCommandIcon({ command }: { command: CommandDescriptor }) {
  return <CommandIcon icon={command.icon} commandId={command.id} />;
}
