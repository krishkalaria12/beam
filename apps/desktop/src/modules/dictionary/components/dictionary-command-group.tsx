import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
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
      <LauncherTakeoverSurface>
        <DictionaryView initialQuery={trimmedQuery} onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  // Otherwise, show the command item in the list
  return (
    <CommandGroup>
      <DictionaryCommandItem onSelect={onOpen} />
    </CommandGroup>
  );
}
