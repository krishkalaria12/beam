import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { ActionListPanel, ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { RunnerToast } from "@/modules/extensions/components/runner/runner-toast";
import { listenExtensionRunnerActionsToggle } from "@/modules/extensions/components/runner/runner-actions-toggle";
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
  const primaryAction = actions[0];
  const moreActionsCount = Math.max(0, actions.length - (primaryAction ? 1 : 0));

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
    return listenExtensionRunnerActionsToggle(() => {
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
        ) : actions.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setActionsOpen((previous) => !previous);
            }}
            className="ext-footer-actions-toggle h-7 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
          >
            <span>{actions.length} action{actions.length === 1 ? "" : "s"}</span>
            <ChevronsUpDown className="size-3 text-muted-foreground/70" />
          </Button>
        ) : (
          <span className="ext-footer-status">Extension actions</span>
        )
      }
      shortcuts={[
        { keys: ["Esc"], label: "Back" },
        ...(primaryAction ? [{ keys: ["↵"], label: primaryAction.title }] : []),
        ...(actions.length > 0
          ? [
              {
                keys: ["⌘", "K"],
                label: moreActionsCount > 0 ? `${moreActionsCount} more` : "Actions",
              },
            ]
          : []),
      ]}
      showActionsShortcut={false}
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
