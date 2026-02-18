import { useCommandState } from "cmdk";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import clipboardIcon from "@/assets/icons/clipboard.png";

import { ClipboardView } from "./clipboard-view";

type ClipboardCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

export default function ClipboardCommandGroup({ isOpen, onOpen, onBack }: ClipboardCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim().toLowerCase();

  if (isOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-background">
        <ClipboardView onBack={onBack} />
      </div>
    );
  }

  const shouldShowOpenClipboard = query.length === 0 || "clipboard history".includes(query);

  if (!shouldShowOpenClipboard) {
    return null;
  }

  return (
    <CommandGroup>
      <CommandItem value="open clipboard history" onSelect={onOpen}>
        <img src={clipboardIcon} alt="clipboard" className="size-6 rounded-sm object-cover" />
        <p className="truncate text-foreground capitalize">clipboard history</p>
        <CommandShortcut>open</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
