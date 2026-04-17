import { useEffectEvent, useRef, useState } from "react";

import { COMMAND_PANELS } from "@/command-registry/panels";
import {
  getPanelCommandRegistration,
  getPanelPrimaryActionLabel,
} from "@/command-registry/panel-actions-registry";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { isLauncherActionsHotkey, listenLauncherActionsToggle } from "@/lib/launcher-actions";
import { useClipboardActionItems } from "@/modules/clipboard/hooks/use-clipboard-action-items";
import { useExtensionActionItems } from "@/modules/extensions/hooks/use-extension-action-items";
import { useExtensionRunnerActionSections } from "@/modules/extensions/hooks/use-extension-runner-action-items";
import { useFileSearchActionItems } from "@/modules/file-search/hooks/use-file-search-action-items";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { buildSharedTakeoverActionItems } from "@/modules/launcher/components/launcher-takeover-panel-actions";
import { renderTakeoverPanels } from "@/modules/launcher/components/launcher-takeover-panel-renderer";
import type {
  LauncherTakeoverPanelContentProps,
  LauncherTakeoverPanelProps,
} from "@/modules/launcher/components/launcher-takeover-panel-types";
import { dispatchEnterToTarget, dispatchKeyboardShortcutToTarget } from "@/modules/launcher/helper";
import { isTakeoverLauncherPanel } from "@/modules/launcher/lib/takeover-panel-loader";
import { retainTakeoverPanel } from "@/modules/launcher/lib/takeover-panel-retention";
import { useQuicklinksActionItems } from "@/modules/quicklinks/hooks/use-quicklinks-action-items";
import { useScriptCommandActionItems } from "@/modules/script-commands/hooks/use-script-command-action-items";

export function LauncherTakeoverPanel(props: LauncherTakeoverPanelProps) {
  const { activePanel } = props;
  if (!isTakeoverLauncherPanel(activePanel)) {
    return null;
  }

  return <LauncherTakeoverPanelContent {...props} activePanel={activePanel} />;
}

function LauncherTakeoverPanelContent({
  activePanel,
  quicklinksView,
  setQuicklinksView,
  openQuicklinks,
  backToCommands,
  ...rendererInput
}: LauncherTakeoverPanelContentProps) {
  "use no memo";

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsPreviousFocusRef = useRef<HTMLElement | null>(null);
  const retainedPanelsRef = useRef(retainTakeoverPanel([], activePanel));
  const shouldUseSharedActions =
    activePanel !== COMMAND_PANELS.DMENU && activePanel !== COMMAND_PANELS.SETTINGS;
  const panelRegistration = getPanelCommandRegistration(activePanel, quicklinksView);
  const primaryActionLabel = getPanelPrimaryActionLabel(activePanel);
  const clipboardActionItems = useClipboardActionItems();
  const extensionActionItems = useExtensionActionItems();
  const extensionRunnerActionSections = useExtensionRunnerActionSections();
  const fileSearchActionItems = useFileSearchActionItems({
    includeDisabledPlaceholderItems: true,
  });
  const quicklinksActionItems = useQuicklinksActionItems();
  const scriptCommandActionItems = useScriptCommandActionItems();

  function handleActionsOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const currentActiveElement = document.activeElement;
      actionsPreviousFocusRef.current =
        currentActiveElement instanceof HTMLElement ? currentActiveElement : null;
      setActionsOpen(true);
      return;
    }

    setActionsOpen(false);
    window.requestAnimationFrame(() => {
      const previousFocusElement = actionsPreviousFocusRef.current;
      if (previousFocusElement && previousFocusElement.isConnected) {
        previousFocusElement.focus({ preventScroll: true });
      }
    });
  }

  const handleActionsHotkey = useEffectEvent(() => {
    if (!shouldUseSharedActions) {
      return;
    }

    handleActionsOpenChange(!actionsOpen);
  });

  const dispatchShortcut = useEffectEvent(
    (options: {
      key: string;
      code?: string;
      metaKey?: boolean;
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    }) => {
      const previousFocusElement = actionsPreviousFocusRef.current;
      if (previousFocusElement && previousFocusElement.isConnected) {
        previousFocusElement.focus({ preventScroll: true });
        dispatchKeyboardShortcutToTarget(previousFocusElement, options);
        return;
      }

      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dispatchKeyboardShortcutToTarget(activeElement, options);
    },
  );

  const handlePrimaryActionSelect = useEffectEvent(() => {
    if (activePanel === COMMAND_PANELS.TRANSLATION) {
      dispatchShortcut({ key: "Enter", code: "Enter", ctrlKey: true });
      return;
    }

    const previousFocusElement = actionsPreviousFocusRef.current;
    if (previousFocusElement && previousFocusElement.isConnected) {
      previousFocusElement.focus({ preventScroll: true });
      dispatchEnterToTarget(previousFocusElement);
      return;
    }

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatchEnterToTarget(activeElement);
  });

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleActionsHotkey();
    };

    window.addEventListener("keydown", onKeyDown, true);
    const unsubscribeToggle = listenLauncherActionsToggle(() => {
      handleActionsHotkey();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      unsubscribeToggle();
    };
  });

  const sharedRootItems = shouldUseSharedActions
    ? buildSharedTakeoverActionItems({
        activePanel,
        quicklinksView,
        primaryActionLabel,
        setQuicklinksView,
        openQuicklinks,
        backToCommands,
        handlePrimaryActionSelect,
        dispatchShortcut,
        clipboardActionItems,
        extensionActionItems,
        extensionRunnerActionSections,
        fileSearchActionItems,
        quicklinksActionItems,
        scriptCommandActionItems,
      })
    : [];

  const retainedPanels = retainTakeoverPanel(retainedPanelsRef.current, activePanel);
  retainedPanelsRef.current = retainedPanels;

  return (
    <div className="relative h-full w-full">
      <div className="h-full min-h-0">
        {renderTakeoverPanels({
          ...rendererInput,
          activePanel,
          panel: activePanel,
          retainedPanels,
          quicklinksView,
          setQuicklinksView,
          openQuicklinks,
          backToCommands,
          onToggleActions: () => {
            handleActionsOpenChange(!actionsOpen);
          },
        })}
      </div>
      {shouldUseSharedActions ? (
        <LauncherActionsPanel
          open={actionsOpen}
          onOpenChange={handleActionsOpenChange}
          anchorMode="panel-footer"
          rootTitle={`${panelRegistration?.title ?? "Module"} Actions...`}
          rootSearchPlaceholder="Search for actions..."
          rootSections={sharedRootItems}
          defaultTarget={
            panelRegistration
              ? {
                  kind: "command",
                  commandId: panelRegistration.id,
                  title: panelRegistration.title,
                }
              : null
          }
          containerClassName="right-4"
        />
      ) : null}
    </div>
  );
}
