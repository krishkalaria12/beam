import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";
import { ExtensionsView } from "@/modules/extensions/components/extensions-view";

type ExtensionsCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

const EXTENSIONS_KEYWORDS = [
  "extensions",
  "extension store",
  "raycast",
  "install",
  "uninstall",
] as const;

export default function ExtensionsCommandGroup({
  isOpen,
  onOpen,
  onBack,
}: ExtensionsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <ExtensionsView onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const shouldShowOpenExtensions = matchesCommandKeywords(query, EXTENSIONS_KEYWORDS);

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
