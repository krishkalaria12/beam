import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
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
      <OpenModuleCommandRow
        value="open extensions manager"
        onSelect={onOpen}
        icon={<CommandIcon icon="extension" />}
        title="extensions"
      />
    </CommandGroup>
  );
}
