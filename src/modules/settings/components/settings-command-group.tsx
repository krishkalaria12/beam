import { useCommandState } from "cmdk";
import { useCallback, useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { matchesCommandKeywords, normalizeCommandQuery } from "@/modules/launcher/lib/command-query";
import type { SettingsView } from "../constants";
import { SettingsMenu } from "./SettingsMenu";
import { VisualStyleSettings } from "./VisualStyleSettings";
import { LayoutSettings } from "./LayoutSettings";
import { PinnedCommandsSettings } from "./PinnedCommandsSettings";
import HotkeysSettings from "./HotkeysSettings";

type SettingsCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
  pinnedCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
};

const SETTINGS_KEYWORDS = [
  "settings",
  "style",
  "layout",
  "density",
  "glassy",
  "pinned",
  "pin",
  "hotkeys",
  "shortcuts",
  "wayland",
  "compositor",
] as const;

export default function SettingsCommandGroup({
  isOpen,
  onOpen,
  onBack,
  pinnedCommandIds,
  onSetPinned,
  onMovePinned,
}: SettingsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);
  const [view, setView] = useState<SettingsView>("main");

  const handleBack = useCallback(() => {
    if (view === "main") {
      onBack();
    } else {
      setView("main");
    }
  }, [onBack, view]);

  useLauncherPanelBackHandler("settings", handleBack, isOpen);

  if (!isOpen) {
    const shouldShowOpenSettings = matchesCommandKeywords(query, SETTINGS_KEYWORDS);

    if (!shouldShowOpenSettings) {
      return null;
    }

    return (
      <CommandGroup>
        <OpenModuleCommandRow
          value="open settings"
          onSelect={() => {
            setView("main");
            onOpen();
          }}
          icon={<CommandIcon icon="settings" />}
          title="settings"
        />
      </CommandGroup>
    );
  }

  return (
    <>
      {view === "main" && <SettingsMenu setView={setView} />}
      {view === "style" && <VisualStyleSettings />}
      {view === "layout" && <LayoutSettings />}
      {view === "pinned" && (
        <PinnedCommandsSettings
          pinnedCommandIds={pinnedCommandIds}
          onSetPinned={onSetPinned}
          onMovePinned={onMovePinned}
        />
      )}
      {view === "hotkeys" && <HotkeysSettings />}
    </>
  );
}
