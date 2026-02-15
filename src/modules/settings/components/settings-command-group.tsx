import { useCommandState } from "cmdk";
import { useState } from "react";
import { Settings } from "lucide-react";

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
          className="group rounded-xl px-4 py-3 transition-all hover:bg-accent/50" 
          onSelect={() => {
            setView("main");
            onOpen();
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-500 ring-1 ring-blue-500/20 transition-all group-data-selected:from-blue-500 group-data-selected:to-purple-500 group-data-selected:text-white group-data-selected:ring-0 group-data-selected:shadow-lg group-data-selected:shadow-blue-500/20">
            <Settings className="size-5" />
          </div>
          <div className="flex flex-col ml-4">
            <p className="text-[1rem] font-medium leading-tight text-foreground tracking-tight">Settings</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Customize your Beam experience</p>
          </div>
          <CommandShortcut className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 group-data-selected:text-foreground/50">
            open
          </CommandShortcut>
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
