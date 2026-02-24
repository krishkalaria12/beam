import { Keyboard, Minimize2, Pin, Sparkles } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import type { SettingsView } from "../constants";

interface SettingsMenuProps {
  setView: (view: SettingsView) => void;
}

export function SettingsMenu({ setView }: SettingsMenuProps) {
  return (
    <CommandGroup>
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

      <CommandItem
        value="pinned commands pin unpin command items"
        onSelect={() => setView("pinned")}
      >
        <Pin className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">pinned commands</p>
        <CommandShortcut>pins</CommandShortcut>
      </CommandItem>

      <CommandItem
        value="hotkeys shortcuts launcher command bindings wayland compositor"
        onSelect={() => setView("hotkeys")}
      >
        <Keyboard className="size-5 text-muted-foreground/70" />
        <p className="truncate text-foreground capitalize">hotkeys</p>
        <CommandShortcut>keys</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
