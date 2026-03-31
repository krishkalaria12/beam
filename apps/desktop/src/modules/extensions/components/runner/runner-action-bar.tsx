import { ChevronsUpDown } from "lucide-react";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { requestLauncherActionsToggle } from "@/lib/launcher-actions";
import { RunnerToast } from "@/modules/extensions/components/runner/runner-toast";
import {
  type ExtensionActionPanelPage,
  getExtensionActionPageItemCount,
  getPrimaryExtensionAction,
} from "@/modules/extensions/components/runner/types";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerActionBarProps {
  actions: ExtensionActionPanelPage;
  toast?: ExtensionToast;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
}

function actionsShortcutKeys(): string[] {
  if (typeof navigator !== "undefined" && /mac/i.test(navigator.platform)) {
    return ["⌘", "K"];
  }

  return ["Ctrl", "K"];
}

export function RunnerActionBar({
  actions,
  toast,
  onToastAction,
  onToastHide,
}: RunnerActionBarProps) {
  const primaryAction = getPrimaryExtensionAction(actions);
  const actionCount = getExtensionActionPageItemCount(actions);

  return (
    <ModuleFooter
      className="ext-footer h-auto min-h-[48px] py-2"
      leftSlot={
        toast ? (
          <div className="ext-footer-status min-w-0">
            <RunnerToast toast={toast} onAction={onToastAction} onHide={onToastHide} />
          </div>
        ) : actionCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              requestLauncherActionsToggle();
            }}
            className="ext-footer-actions-toggle h-7 rounded-md px-2 text-launcher-xs font-medium text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
          >
            <span>Actions</span>
            <span className="rounded-md bg-[var(--launcher-card-bg)] px-1.5 py-0.5 text-[11px] text-muted-foreground/80">
              {actionCount}
            </span>
            <ChevronsUpDown className="size-3 text-muted-foreground/70" />
          </Button>
        ) : (
          <span className="ext-footer-status">Extension actions</span>
        )
      }
      shortcuts={[
        { keys: ["Esc"], label: "Back" },
        ...(primaryAction ? [{ keys: ["↵"], label: primaryAction.title }] : []),
        ...(actionCount > 0
          ? [{ keys: actionsShortcutKeys(), label: `${actionCount} actions` }]
          : []),
      ]}
      showActionsShortcut={false}
    />
  );
}
