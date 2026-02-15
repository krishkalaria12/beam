import { ChevronRight, Moon, Palette } from "lucide-react";
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
        className="rounded-md px-3 py-2.5 mb-2 opacity-60 hover:opacity-100 transition-opacity" 
        onSelect={onBack}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-border/50 bg-muted/30">
            <kbd className="text-[10px] font-medium leading-none">esc</kbd>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest">Back to Beam</span>
        </div>
      </CommandItem>

      <div className="px-2 pb-2 pt-1">
        <p className="px-2 mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          Preferences
        </p>
        
        <div className="space-y-1">
          <CommandItem
            value="appearance mode"
            onSelect={() => setView("appearance")}
            className="group flex items-center justify-between rounded-lg px-3 py-3 transition-all hover:bg-accent/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-data-selected:bg-primary group-data-selected:text-primary-foreground group-data-selected:ring-0">
                <Moon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.95rem] font-medium tracking-tight">Appearance Mode</span>
                <span className="text-xs text-muted-foreground/70">Toggle between light and dark</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="size-4 text-muted-foreground/30 transition-transform group-data-selected:translate-x-0.5 group-data-selected:text-foreground/50" />
            </div>
          </CommandItem>

          <CommandItem
            value="theme selection"
            onSelect={() => setView("themes")}
            className="group flex items-center justify-between rounded-lg px-3 py-3 transition-all hover:bg-accent/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/5 text-orange-500 ring-1 ring-orange-500/10 transition-colors group-data-selected:bg-orange-500 group-data-selected:text-white group-data-selected:ring-0">
                <Palette className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.95rem] font-medium tracking-tight">Theme Selection</span>
                <span className="text-xs text-muted-foreground/70">Customize colors and accents</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="size-4 text-muted-foreground/30 transition-transform group-data-selected:translate-x-0.5 group-data-selected:text-foreground/50" />
            </div>
          </CommandItem>
        </div>
      </div>
    </CommandGroup>
  );
}
