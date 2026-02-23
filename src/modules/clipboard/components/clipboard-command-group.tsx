import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

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
      <OpenModuleCommandRow
        value="open clipboard history"
        onSelect={onOpen}
        icon={<CommandIcon icon="clipboard" />}
        title="clipboard history"
      />
    </CommandGroup>
  );
}
