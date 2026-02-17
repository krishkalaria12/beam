import { Link2, Plus } from "lucide-react";

import { CommandGroup, CommandItem } from "@/components/ui/command";

interface QuicklinksCommandItemProps {
  onAdd: () => void;
  onManage: () => void;
}

export function QuicklinksCommandItem({ onAdd, onManage }: QuicklinksCommandItemProps) {
  return (
    <CommandGroup>
      <CommandItem value="add quicklink" onSelect={onAdd}>
        <Plus className="mr-2 size-4" />
        <span>Add Quicklink</span>
      </CommandItem>
      <CommandItem value="manage quicklinks" onSelect={onManage}>
        <Link2 className="mr-2 size-4" />
        <span>Manage Quicklinks</span>
      </CommandItem>
    </CommandGroup>
  );
}
