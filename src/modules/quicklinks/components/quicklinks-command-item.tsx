import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import createQuicklinkIcon from "@/assets/icons/create-quicklink.jpeg";
import listQuicklinksIcon from "@/assets/icons/list-quicklink.png";

interface QuicklinksCommandItemProps {
  onAdd: () => void;
  onManage: () => void;
}

export function QuicklinksCommandItem({ onAdd, onManage }: QuicklinksCommandItemProps) {
  return (
    <CommandGroup>
      <CommandItem value="add quicklink" onSelect={onAdd}>
        <img
          src={createQuicklinkIcon}
          alt="create quicklink icon"
          loading="lazy"
          className="size-6 rounded-sm object-cover"
        />
        <span>Add Quicklink</span>
        <CommandShortcut>quicklink</CommandShortcut>
      </CommandItem>
      <CommandItem value="manage quicklinks" onSelect={onManage}>
        <img
          src={listQuicklinksIcon}
          alt="manage quicklinks icon"
          loading="lazy"
          className="size-6 rounded-sm object-cover"
        />
        <span>Manage Quicklinks</span>
        <CommandShortcut>quicklink</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
