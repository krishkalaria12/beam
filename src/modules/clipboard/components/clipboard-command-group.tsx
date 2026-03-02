import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { ClipboardView } from "./clipboard-view";

type ClipboardCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

const CLIPBOARD_KEYWORDS = ["clipboard", "clipboard history"] as const;

export default function ClipboardCommandGroup({
  isOpen,
  onOpen,
  onBack,
}: ClipboardCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <ClipboardView onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const shouldShowOpenClipboard = matchesCommandKeywords(query, CLIPBOARD_KEYWORDS);

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
