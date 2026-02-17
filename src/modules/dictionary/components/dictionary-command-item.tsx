import dictionaryIcon from "@/assets/icons/dictionary.png";
import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { useCommandState } from "cmdk";

interface DictionaryCommandItemProps {
  onSelect: (query: string) => void;
}

export function DictionaryCommandItem({ onSelect }: DictionaryCommandItemProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();
  const hasQuery = query.length > 0;

  return (
    <CommandItem
      value="dictionary-search"
      disabled={!hasQuery}
      onSelect={() => {
        if (!hasQuery) {
          return;
        }
        onSelect(query);
      }}
    >
      <img
        src={dictionaryIcon}
        alt="dictionary icon"
        loading="lazy"
        className="size-6 rounded-sm object-cover"
      />
      <p className="truncate text-foreground capitalize">
        Search word with dictionary
      </p>
      <CommandShortcut>dictionary</CommandShortcut>
    </CommandItem>
  );
}
