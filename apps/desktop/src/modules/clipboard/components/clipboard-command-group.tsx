import { useCommandState } from "cmdk";
import { useQueryClient } from "@tanstack/react-query";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { getClipboardHistoryQueryOptions } from "../api/query";
import { ClipboardView } from "./clipboard-view";

type ClipboardCommandGroupProps = {
  isOpen: boolean;
  isActive?: boolean;
  onOpen: () => void;
  onBack: () => void;
  onToggleActions: () => void;
};

const CLIPBOARD_KEYWORDS = ["clipboard", "clipboard history"] as const;

export default function ClipboardCommandGroup({
  isOpen,
  isActive = true,
  onOpen,
  onBack,
  onToggleActions,
}: ClipboardCommandGroupProps) {
  const queryClient = useQueryClient();
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  const prefetchClipboardHistory = () => {
    void queryClient.ensureQueryData(getClipboardHistoryQueryOptions());
  };

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <ClipboardView isActive={isActive} onBack={onBack} onToggleActions={onToggleActions} />
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
        onPointerEnter={prefetchClipboardHistory}
        onFocus={prefetchClipboardHistory}
        icon={<CommandIcon icon="clipboard" />}
        title="clipboard history"
      />
    </CommandGroup>
  );
}
