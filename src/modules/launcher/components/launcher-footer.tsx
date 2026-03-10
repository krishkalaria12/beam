import { useEffect, useState, type ReactNode } from "react";

import {
  CommandFooterBar,
  type FooterAction,
} from "@/components/command/command-footer-bar";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { isLauncherActionsHotkey } from "@/lib/launcher-actions";

interface LauncherFooterProps {
  leftSlot?: ReactNode;
  primaryAction?: FooterAction;
}

export function LauncherFooter({ leftSlot, primaryAction }: LauncherFooterProps) {
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
      leftSlot={leftSlot ?? <span>Beam</span>}
      primaryAction={
        primaryAction ?? {
          label: "Open",
          shortcut: ["↩"],
        }
      }
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
