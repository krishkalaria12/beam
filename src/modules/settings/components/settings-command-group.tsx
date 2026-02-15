import { useCommandState } from "cmdk";
import { useState } from "react";
import { Settings } from "lucide-react";

import settingsIcon from "@/assets/icons/settings.png";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import type { SettingsView } from "../constants";
import { SettingsMenu } from "./SettingsMenu";
import { AppearanceSettings } from "./AppearanceSettings";
import { ThemeSettings } from "./ThemeSettings";

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
        <CommandItem 
          value="open settings" 
          onSelect={() => {
            setView("main");
            onOpen();
          }}
        >
          <img src={settingsIcon} alt="settings" className="size-6 rounded-sm object-cover" />
          <p className="truncate text-foreground capitalize">settings</p>
          <CommandShortcut>open</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    );
  }

  return (
    <>
      {view === "main" && <SettingsMenu setView={setView} onBack={handleBack} />}
      {view === "appearance" && <AppearanceSettings onBack={handleBack} />}
      {view === "themes" && <ThemeSettings onBack={handleBack} />}
    </>
  );
}
