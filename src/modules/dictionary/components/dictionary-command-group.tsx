import { CommandGroup } from "@/components/ui/command";
import { DictionaryCommandItem } from "./dictionary-command-item";
import { DictionaryView } from "./dictionary-view";

interface DictionaryCommandGroupProps {
  isOpen: boolean;
  onOpen: (query: string) => void;
  onBack: () => void;
  query?: string;
}

export default function DictionaryCommandGroup({
  isOpen,
  onOpen,
  onBack,
  query,
}: DictionaryCommandGroupProps) {
  // If the panel is open, render the full view
  if (isOpen) {
    const trimmedQuery = query?.trim() ?? "";
    return (
      <div className="absolute inset-0 z-50 bg-background">
        <DictionaryView initialQuery={trimmedQuery} onBack={onBack} />
      </div>
    );
  }

  // Otherwise, show the command item in the list
  return (
    <CommandGroup>
      <DictionaryCommandItem onSelect={onOpen} />
    </CommandGroup>
  );
}
