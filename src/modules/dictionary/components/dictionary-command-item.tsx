import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { useCommandState } from "cmdk";

interface DictionaryCommandItemProps {
  onSelect: (query: string) => void;
}

export function DictionaryCommandItem({ onSelect }: DictionaryCommandItemProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();
  const hasQuery = query.length > 0;

  return (
    <BaseCommandRow
      value="dictionary-search"
      disabled={!hasQuery}
      onSelect={() => {
        if (!hasQuery) {
          return;
        }
        onSelect(query);
      }}
      icon={<CommandIcon icon="dictionary" />}
      title="Search word with dictionary"
      titleClassName="truncate text-foreground capitalize"
      shortcut="dictionary"
    />
  );
}
