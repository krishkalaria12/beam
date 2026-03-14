import { useEffect, useState } from "react";

import { ActionListPanel, ModuleFooter } from "@/components/module";
import { listenLauncherActionsToggle } from "@/lib/launcher-actions";
import { RunnerToast } from "@/modules/extensions/components/runner/runner-toast";
import type { FlattenedAction } from "@/modules/extensions/components/runner/types";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerActionBarProps {
  actions: FlattenedAction[];
  toast?: ExtensionToast;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: FlattenedAction) => void;
}

export function RunnerActionBar({
  actions,
  toast,
  onToastAction,
  onToastHide,
  onExecuteAction,
}: RunnerActionBarProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  const parseShortcut = (shortcut?: string): string[] => {
    if (!shortcut) {
      return [];
    }
    return shortcut
      .split("+")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  };

  useEffect(() => {
    if (actions.length === 0) {
      setActionsOpen(false);
    }
  }, [actions.length]);

  useEffect(() => {
    return listenLauncherActionsToggle(() => {
      if (actions.length === 0) {
        return;
      }

      setActionsOpen((previous) => !previous);
    });
  }, [actions.length]);

  return (
    <ModuleFooter
      className="ext-footer h-auto min-h-[48px] py-2"
      leftSlot={
        toast ? (
          <div className="ext-footer-status min-w-0">
            <RunnerToast toast={toast} onAction={onToastAction} onHide={onToastHide} />
          </div>
        ) : (
          <span className="ext-footer-status">Extension actions</span>
        )
      }
      shortcuts={[
        { keys: ["Esc"], label: "Back" },
        ...actions
          .filter((action) => action.shortcut)
          .map((action) => ({ keys: parseShortcut(action.shortcut), label: action.title })),
      ]}
      overlay={
        actions.length > 0 ? (
          <ActionListPanel
            open={actionsOpen}
            onOpenChange={setActionsOpen}
            showTrigger={false}
            className="ext-actions-control absolute top-0 right-4 h-0 w-0"
            panelClassName="ext-actions-panel"
            items={actions.map((action) => ({
              key: String(action.nodeId),
              title: action.title,
              shortcut: parseShortcut(action.shortcut),
              danger: action.style === "destructive",
              onSelect: () => onExecuteAction(action),
            }))}
          />
        ) : undefined
      }
    />
  );
}
