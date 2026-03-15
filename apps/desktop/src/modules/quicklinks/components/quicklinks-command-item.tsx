import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

interface QuicklinksCommandItemProps {
  onAdd: () => void;
  onManage: () => void;
}

export function QuicklinksCommandItem({ onAdd, onManage }: QuicklinksCommandItemProps) {
  return (
    <CommandGroup>
      <BaseCommandRow
        value="add quicklink"
        onSelect={onAdd}
        icon={<CommandIcon icon="quicklink-create" />}
        title="Add Quicklink"
        shortcut="quicklink"
      />
      <BaseCommandRow
        value="manage quicklinks"
        onSelect={onManage}
        icon={<CommandIcon icon="quicklink-manage" />}
        title="Manage Quicklinks"
        shortcut="quicklink"
      />
    </CommandGroup>
  );
}
