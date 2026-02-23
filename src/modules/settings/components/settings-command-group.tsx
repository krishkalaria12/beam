import { useCommandState } from "cmdk";
import { useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { matchesCommandKeywords, normalizeCommandQuery } from "@/modules/launcher/lib/command-query";
import type { SettingsView } from "../constants";
import { SettingsMenu } from "./SettingsMenu";
import { AppearanceSettings } from "./AppearanceSettings";
import { ThemeSettings } from "./ThemeSettings";
import { LayoutSettings } from "./LayoutSettings";

type SettingsCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

const SETTINGS_KEYWORDS = [
  "settings",
  "theme",
  "colors",
  "appearance",
  "mode",
] as const;

export default function SettingsCommandGroup({ isOpen, onOpen, onBack }: SettingsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);
  const [view, setView] = useState<SettingsView>("main");

  const handleBack = () => {
    if (view === "main") {
      onBack();
    } else {
      setView("main");
    }
  };

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
      {view === "main" && <SettingsMenu setView={setView} onBack={handleBack} />}
      {view === "appearance" && <AppearanceSettings onBack={handleBack} />}
      {view === "themes" && <ThemeSettings onBack={handleBack} />}
      {view === "layout" && <LayoutSettings onBack={handleBack} />}
    </>
  );
}
