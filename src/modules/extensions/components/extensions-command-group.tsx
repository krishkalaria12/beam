import { useCommandState } from "cmdk";
import { Puzzle } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { ExtensionsView } from "@/modules/extensions/components/extensions-view";

type ExtensionsCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

export default function ExtensionsCommandGroup({
  isOpen,
  onOpen,
  onBack,
}: ExtensionsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim().toLowerCase();

  if (isOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-background">
        <ExtensionsView onBack={onBack} />
      </div>
    );
  }

  const shouldShowOpenExtensions =
    query.length === 0 ||
    "extensions extension store raycast install uninstall".includes(query);

  if (!shouldShowOpenExtensions) {
    return null;
  }

  return (
    <CommandGroup>
      <CommandItem value="open extensions manager" onSelect={onOpen}>
        <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Puzzle className="size-4" />
        </div>
        <p className="truncate text-foreground capitalize">extensions</p>
        <CommandShortcut>open</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
