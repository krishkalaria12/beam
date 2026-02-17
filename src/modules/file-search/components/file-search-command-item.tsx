import filesIcon from "@/assets/icons/files.png";
import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { useCommandState } from "cmdk";

interface FileSearchCommandItemProps {
  onSelect: (query: string) => void;
  queryOverride?: string;
}

export function FileSearchCommandItem({ onSelect, queryOverride }: FileSearchCommandItemProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = (queryOverride ?? searchInput).trim();
  const hasQuery = query.length > 0;

  return (
    <CommandItem
      value="Search Files"
      disabled={!hasQuery}
      onSelect={() => {
        if (!hasQuery) {
          return;
        }
        onSelect(query);
      }}
    >
      <img
        src={filesIcon}
        alt="files icon"
        loading="lazy"
        className="size-6 rounded-sm object-cover"
      />
      <p className="truncate text-foreground capitalize">
        Search Files
      </p>
      <CommandShortcut>
        files
      </CommandShortcut>
    </CommandItem>
  );
}
