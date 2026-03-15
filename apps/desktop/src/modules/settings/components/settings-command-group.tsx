import { useCommandState } from "cmdk";
import { useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";
import type { SettingsCommandGroupProps, SettingsView } from "@/modules/settings/types";
import { SettingsMenu } from "./SettingsMenu";
import { SettingsViewWrapper } from "./SettingsView";
import { VisualStyleSettings } from "./VisualStyleSettings";
import { LayoutSettings } from "./LayoutSettings";
import { PinnedCommandsSettings } from "./PinnedCommandsSettings";
import HotkeysSettings from "./HotkeysSettings";
import { TriggerSymbolsSettings } from "./TriggerSymbolsSettings";
import { CommandItemsSettings } from "./CommandItemsSettings";
import { DesktopIntegrationSettings } from "./DesktopIntegrationSettings";

const SETTINGS_KEYWORDS = [
  "settings",
  "theme",
  "themes",
  "custom",
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
  "bang",
  "bangs",
  "symbol",
  "symbols",
  "trigger",
  "prefix",
  "hide",
  "hidden",
  "disable",
  "disabled",
  "command items",
  "desktop integration",
  "gnome",
  "kde",
  "x11",
  "window backend",
  "clipboard backend",
] as const;

export default function SettingsCommandGroup({
  isOpen,
  onOpen,
  onBack,
  pinnedCommandIds,
  hiddenCommandIds,
  onSetPinned,
  onSetHidden,
  onMovePinned,
}: SettingsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);
  const [view, setView] = useState<SettingsView>("main");

  function handleBack() {
    if (view === "main") {
      onBack();
    } else {
      setView("main");
    }
  }

  function handleNavigateToMain() {
    setView("main");
  }

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

  const renderContent = () => {
    switch (view) {
      case "main":
        return <SettingsMenu setView={setView} />;
      case "style":
        return <VisualStyleSettings />;
      case "layout":
        return <LayoutSettings />;
      case "pinned":
        return (
          <PinnedCommandsSettings
            pinnedCommandIds={pinnedCommandIds}
            onSetPinned={onSetPinned}
            onMovePinned={onMovePinned}
          />
        );
      case "command-items":
        return (
          <CommandItemsSettings hiddenCommandIds={hiddenCommandIds} onSetHidden={onSetHidden} />
        );
      case "desktop-integration":
        return <DesktopIntegrationSettings />;
      case "hotkeys":
        return <HotkeysSettings />;
      case "trigger-symbols":
        return <TriggerSymbolsSettings />;
      default:
        return null;
    }
  };

  return (
    <SettingsViewWrapper view={view} onBack={handleBack} onNavigateToMain={handleNavigateToMain}>
      {renderContent()}
    </SettingsViewWrapper>
  );
}
