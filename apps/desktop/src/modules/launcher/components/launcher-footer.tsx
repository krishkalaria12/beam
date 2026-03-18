import { useRef, useState, type ReactNode } from "react";

import { CommandFooterBar, type FooterAction } from "@/components/command/command-footer-bar";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { isLauncherActionsHotkey } from "@/lib/launcher-actions";

interface LauncherFooterProps {
  leftSlot?: ReactNode;
  primaryAction?: FooterAction;
}

export function LauncherFooter({ leftSlot, primaryAction }: LauncherFooterProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const setActionsOpenRef = useRef(setActionsOpen);
  setActionsOpenRef.current = setActionsOpen;

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setActionsOpenRef.current((previous) => !previous);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  });

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
      overlay={<LauncherActionsPanel open={actionsOpen} onOpenChange={setActionsOpen} />}
    />
  );
}
