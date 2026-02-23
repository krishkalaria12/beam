import { useCommandState } from "cmdk";
import { useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
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

export default function SettingsCommandGroup({ isOpen, onOpen, onBack }: SettingsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim().toLowerCase();
  const [view, setView] = useState<SettingsView>("main");

  const handleBack = () => {
    if (view === "main") {
      onBack();
    } else {
      setView("main");
    }
  };

  if (!isOpen) {
    const shouldShowOpenSettings = query.length === 0 || "settings theme colors appearance mode".includes(query);

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
