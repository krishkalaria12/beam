import { ChevronsUpDown } from "lucide-react";
import { useEffectEvent, useMemo, useState } from "react";

import {
  ActionListPanel,
  type ActionListPanelItem,
  type ActionListPanelPage,
  type ActionListPanelSection,
  ModuleFooter,
} from "@/components/module";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import { listenExtensionRunnerActionsToggle } from "@/modules/extensions/components/runner/runner-actions-toggle";
import { parseShortcutTokens } from "@/modules/extensions/components/runner/shortcut-utils";
import { RunnerToast } from "@/modules/extensions/components/runner/runner-toast";
import {
  type ExtensionAction,
  type ExtensionActionNode,
  type ExtensionActionPanelPage,
  type ExtensionActionSection,
  type ExtensionActionSubmenu,
  getExtensionActionPageItemCount,
  getPrimaryExtensionAction,
} from "@/modules/extensions/components/runner/types";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerActionBarProps {
  actions: ExtensionActionPanelPage;
  toast?: ExtensionToast;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: ExtensionAction) => void;
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void;
}

function mapActionSection(
  section: ExtensionActionSection,
  isRootPage: boolean,
  primaryActionNodeId: number | undefined,
  onExecuteAction: (action: ExtensionAction) => void,
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void,
): ActionListPanelSection {
  const items = section.items.map((item) =>
    mapActionItem(item, isRootPage, primaryActionNodeId, onExecuteAction, onOpenSubmenu),
  );

  return {
    key: section.key,
    title: section.title,
    items,
  };
}

function mapActionItem(
  item: ExtensionActionNode,
  isRootPage: boolean,
  primaryActionNodeId: number | undefined,
  onExecuteAction: (action: ExtensionAction) => void,
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void,
): ActionListPanelItem {
  return {
    key: item.key,
    title: item.title,
    icon: item.icon ? <RunnerIcon icon={item.icon} className="size-4.5" /> : undefined,
    shortcut: parseShortcutTokens(item.shortcut),
    shortcutDefinition: item.shortcutDefinition,
    danger: item.style === "destructive",
    primary: isRootPage && item.kind === "action" && item.nodeId === primaryActionNodeId,
    autoFocus: item.autoFocus,
    submenu:
      item.kind === "submenu"
        ? mapActionPage(item.page, false, undefined, onExecuteAction, onOpenSubmenu)
        : undefined,
    onSelect: item.kind === "action" ? () => onExecuteAction(item) : undefined,
    onOpen: item.kind === "submenu" ? () => onOpenSubmenu(item) : undefined,
  };
}

function mapActionPage(
  page: ExtensionActionPanelPage,
  isRootPage: boolean,
  primaryActionNodeId: number | undefined,
  onExecuteAction: (action: ExtensionAction) => void,
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void,
): ActionListPanelPage {
  return {
    key: page.key,
    title: page.title,
    sections: page.sections.map((section) =>
      mapActionSection(section, isRootPage, primaryActionNodeId, onExecuteAction, onOpenSubmenu),
    ),
  };
}

export function RunnerActionBar({
  actions,
  toast,
  onToastAction,
  onToastHide,
  onExecuteAction,
  onOpenSubmenu,
}: RunnerActionBarProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionPanelSession, setActionPanelSession] = useState(0);
  const primaryAction = getPrimaryExtensionAction(actions);
  const actionCount = getExtensionActionPageItemCount(actions);
  const resolvedActionsOpen = actionCount > 0 && actionsOpen;

  const openActionPanel = useEffectEvent(() => {
    if (actionCount === 0) {
      return;
    }

    setActionPanelSession((previous) => previous + 1);
    setActionsOpen(true);
  });

  const toggleActionPanel = useEffectEvent(() => {
    if (actionCount === 0) {
      return;
    }

    if (actionsOpen) {
      setActionsOpen(false);
      return;
    }

    openActionPanel();
  });

  const actionPanel = useMemo(
    () => mapActionPage(actions, true, primaryAction?.nodeId, onExecuteAction, onOpenSubmenu),
    [actions, onExecuteAction, onOpenSubmenu, primaryAction?.nodeId],
  );

  useMountEffect(() => {
    return listenExtensionRunnerActionsToggle(() => {
      toggleActionPanel();
    });
  });

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
              toggleActionPanel();
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
        ...(actionCount > 0 ? [{ keys: ["⌘", "K"], label: `${actionCount} actions` }] : []),
      ]}
      showActionsShortcut={false}
      overlay={
        actionCount > 0 ? (
          <ActionListPanel
            key={`${actions.key}:${actionPanelSession}`}
            panel={actionPanel}
            open={resolvedActionsOpen}
            onOpenChange={setActionsOpen}
            showTrigger={false}
            className="ext-actions-control absolute right-4 top-0 h-0 w-0"
            panelClassName="ext-actions-panel"
          />
        ) : undefined
      }
    />
  );
}
