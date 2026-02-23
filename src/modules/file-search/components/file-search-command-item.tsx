import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
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
    <BaseCommandRow
      value="Search Files"
      onSelect={() => {
        if (!hasQuery) {
          return;
        }
        onSelect(query);
      }}
      icon={<CommandIcon icon="files" />}
      title="Search Files"
      titleClassName="truncate text-foreground capitalize"
      shortcut="files"
    />
  );
}
