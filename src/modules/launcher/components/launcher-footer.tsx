import { useEffect, useState } from "react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { isLauncherActionsHotkey } from "@/lib/launcher-actions";

export function LauncherFooter() {
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setActionsOpen((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return (
    <CommandFooterBar
      leftSlot={<span>Beam</span>}
      primaryAction={{
        label: "Open",
        shortcut: ["↩"],
      }}
      secondaryActions={[
        {
          label: "Back",
          shortcut: ["ESC"],
        },
      ]}
      actionsButton={{
        label: "Actions",
        shortcut: ["⌘", "K"],
        onClick: () => {
          setActionsOpen((previous) => !previous);
        },
      }}
      overlay={<LauncherActionsPanel open={actionsOpen} onOpenChange={setActionsOpen} />}
    />
  );
}
