import { Search } from "lucide-react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";

export function LauncherFooter() {
  return (
    <CommandFooterBar
      leftSlot={(
        <>
          <Search className="size-3" />
          <span>Beam</span>
        </>
      )}
      rightSlot={(
        <>
          <CommandKeyHint keyLabel="ENTER" label="Open" />
          <CommandKeyHint keyLabel="ESC" label="Back" />
        </>
      )}
    />
  );
}
