import { useEffect, useState } from "react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";

export function LauncherFooter() {
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        event.stopPropagation();
        setActionsOpen((previous) => !previous);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
