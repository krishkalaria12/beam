import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { FileSearchCommandItem } from "./file-search-command-item";
import { FileSearchView } from "./file-search-view";

interface FileSearchCommandGroupProps {
  isOpen: boolean;
  onOpen: (query: string) => void;
  onBack: () => void;
  query?: string;
  queryOverride?: string;
}

export default function FileSearchCommandGroup({
  isOpen,
  onOpen,
  onBack,
  query,
  queryOverride,
}: FileSearchCommandGroupProps) {
  // If the panel is open, we render the full view which takes over the command list content
  if (isOpen) {
    const trimmedQuery = query?.trim() ?? "";
    return (
      <LauncherTakeoverSurface>
        <FileSearchView 
            initialQuery={trimmedQuery}
            onBack={onBack} 
        />
      </LauncherTakeoverSurface>
    );
  }

  // Otherwise, we show the command item in the list
  // The FileSearchCommandItem will read the query from cmdk's state
  return (
      <CommandGroup>
        <FileSearchCommandItem onSelect={onOpen} queryOverride={queryOverride} />
      </CommandGroup>
  );
}
