import { ArrowLeft, Minimize2, Moon, Palette, Sparkles } from "lucide-react";

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
        className="opacity-70"
        onSelect={onBack}
      >
        <ArrowLeft className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">back to commands</p>
        <CommandShortcut>back</CommandShortcut>
      </CommandItem>

      <CommandItem
        value="appearance mode dark light"
        onSelect={() => setView("appearance")}
      >
        <Moon className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">appearance mode</p>
        <CommandShortcut>theme</CommandShortcut>
      </CommandItem>

      <CommandItem
        value="theme selection palette colors"
        onSelect={() => setView("themes")}
      >
        <Palette className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">theme selection</p>
        <CommandShortcut>theme</CommandShortcut>
      </CommandItem>

      <CommandItem
        value="visual style glassy default color tint"
        onSelect={() => setView("style")}
      >
        <Sparkles className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">visual style</p>
        <CommandShortcut>style</CommandShortcut>
      </CommandItem>

      <CommandItem
        value="ui density expand compress size"
        onSelect={() => setView("layout")}
      >
        <Minimize2 className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">ui density</p>
        <CommandShortcut>size</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
