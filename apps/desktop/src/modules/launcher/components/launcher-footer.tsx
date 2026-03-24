import { useEffectEvent, useState, type ReactNode } from "react";

import { CommandFooterBar, type FooterAction } from "@/components/command/command-footer-bar";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useApplicationActionItems } from "@/modules/applications/hooks/use-application-action-items";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { isLauncherActionsHotkey } from "@/lib/launcher-actions";

interface LauncherFooterProps {
  leftSlot?: ReactNode;
  primaryAction?: FooterAction;
  actionsEnabled?: boolean;
}

export function LauncherFooter({
  leftSlot,
  primaryAction,
  actionsEnabled = true,
}: LauncherFooterProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const applicationActionItems = useApplicationActionItems();
  const toggleActions = useEffectEvent(() => {
    if (!actionsEnabled) {
      return;
    }

    setActionsOpen((previous) => !previous);
  });

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!actionsEnabled) {
        return;
      }

      if (!isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      toggleActions();
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
      overlay={
        actionsEnabled ? (
          <LauncherActionsPanel
            open={actionsOpen}
            onOpenChange={setActionsOpen}
            rootItems={applicationActionItems}
          />
        ) : undefined
      }
    />
  );
}
