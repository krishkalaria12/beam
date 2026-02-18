import { ChevronRight, Minimize2, Moon, Palette } from "lucide-react";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import type { SettingsView } from "../constants";

interface SettingsMenuProps {
  setView: (view: SettingsView) => void;
  onBack: () => void;
}

export function SettingsMenu({ setView, onBack }: SettingsMenuProps) {
  return (
    <CommandGroup>
      <CommandItem 
        value="back to commands" 
        className="mb-1 opacity-60 hover:opacity-100 transition-opacity" 
        onSelect={onBack}
      >
        <div className="flex items-center gap-2">
          <kbd className="text-[10px] font-medium leading-none border border-border/50 bg-muted/30 px-1 py-0.5 rounded-sm">esc</kbd>
          <span className="font-mono text-[10px] uppercase tracking-widest">Back</span>
        </div>
      </CommandItem>

      <div className="px-1 pb-1">
        <p className="px-2 mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          Preferences
        </p>
        
        <div className="space-y-0.5">
          <CommandItem
            value="appearance mode"
            onSelect={() => setView("appearance")}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Moon className="size-6 text-muted-foreground/60" />
              <span className="text-sm font-medium">Appearance Mode</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/30" />
          </CommandItem>

          <CommandItem
            value="theme selection"
            onSelect={() => setView("themes")}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Palette className="size-6 text-muted-foreground/60" />
              <span className="text-sm font-medium">Theme Selection</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/30" />
          </CommandItem>

          <CommandItem
            value="ui density expand compress"
            onSelect={() => setView("layout")}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Minimize2 className="size-6 text-muted-foreground/60" />
              <span className="text-sm font-medium">UI Density</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/30" />
          </CommandItem>
        </div>
      </div>
    </CommandGroup>
  );
}
