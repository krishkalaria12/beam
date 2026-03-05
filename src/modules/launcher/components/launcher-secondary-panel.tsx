import { ArrowLeft, AtSign, Calculator, CornerDownLeft, Keyboard, Smile } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import {
  getPanelCommandRegistration,
  getPanelPrimaryActionLabel,
} from "@/command-registry/panel-actions-registry";
import { isLauncherActionsHotkey, listenLauncherActionsToggle } from "@/lib/launcher-actions";
import type { CommandPanel } from "@/command-registry/types";
import type { LauncherActionItem } from "@/modules/launcher/components/launcher-actions-panel";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { dispatchKeyboardShortcutToTarget, dispatchEnterToTarget } from "@/modules/launcher/helper";

const CalculatorHistoryCommandGroup = lazy(
  () => import("@/modules/calculator-history/components/calculator-history-command-group"),
);
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SettingsCommandGroup = lazy(
  () => import("@/modules/settings/components/settings-command-group"),
);

const SECONDARY_PANELS = ["calculator-history", "emoji", "settings"] as const;

type SecondaryPanel = (typeof SECONDARY_PANELS)[number];

function isSecondaryPanel(panel: CommandPanel): panel is SecondaryPanel {
  return (SECONDARY_PANELS as readonly string[]).includes(panel);
}

interface SecondaryPanelRendererInput {
  onOpenCalculatorHistory: () => void;
  onOpenEmoji: () => void;
  onOpenSettings: () => void;
  onBack: () => void;
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  fallbackEnabled: boolean;
  fallbackCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
  onSetFallbackEnabled: (enabled: boolean) => void;
  onSetFallbackCommandIds: (fallbackCommandIds: readonly string[]) => void;
}

interface LauncherSecondaryPanelProps extends SecondaryPanelRendererInput {
  activePanel: CommandPanel;
}

function SecondaryPanelFallback() {
  return <CommandLoadingState label="Loading..." className="px-4 py-6 text-xs" />;
}

export function LauncherSecondaryPanel({
  activePanel,
  onOpenCalculatorHistory,
  onOpenEmoji,
  onOpenSettings,
  onBack,
  pinnedCommandIds,
  hiddenCommandIds,
  fallbackEnabled,
  fallbackCommandIds,
  onSetPinned,
  onSetHidden,
  onMovePinned,
  onSetFallbackEnabled,
  onSetFallbackCommandIds,
}: LauncherSecondaryPanelProps) {
  const secondaryPanelIsOpen = isSecondaryPanel(activePanel);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsPreviousFocusRef = useRef<HTMLElement | null>(null);
  const panelRegistration = getPanelCommandRegistration(activePanel);
  const primaryActionLabel = getPanelPrimaryActionLabel(activePanel);

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

  useEffect(() => {
    setActionsOpen(false);
  }, [activePanel]);

  useEffect(() => {
    if (!secondaryPanelIsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleActionsOpenChange(!actionsOpen);
    };

    window.addEventListener("keydown", onKeyDown, true);
    const unsubscribeToggle = listenLauncherActionsToggle(() => {
      handleActionsOpenChange(!actionsOpen);
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      unsubscribeToggle();
    };
  }, [actionsOpen, secondaryPanelIsOpen]);

  function dispatchShortcut(options: {
    key: string;
    code?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  }) {
    const previousFocusElement = actionsPreviousFocusRef.current;
    if (previousFocusElement && previousFocusElement.isConnected) {
      previousFocusElement.focus({ preventScroll: true });
      dispatchKeyboardShortcutToTarget(previousFocusElement, options);
      return;
    }

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatchKeyboardShortcutToTarget(activeElement, options);
  }

  const panelSpecificRootItems: LauncherActionItem[] = [];
  if (activePanel === "settings") {
    panelSpecificRootItems.push(
      {
        id: "settings-open-calculator-history",
        label: "Open Calculator History",
        icon: <Calculator className="size-4" />,
        keywords: ["settings", "calculator", "history"],
        onSelect: onOpenCalculatorHistory,
      },
      {
        id: "settings-open-emoji",
        label: "Open Emoji Picker",
        icon: <Smile className="size-4" />,
        keywords: ["settings", "emoji", "picker"],
        onSelect: onOpenEmoji,
      },
    );
  }

  const sharedRootItems: LauncherActionItem[] = secondaryPanelIsOpen
    ? [
        {
          id: `${activePanel}-primary-action`,
          label: primaryActionLabel,
          icon: <CornerDownLeft className="size-4" />,
          shortcut: "↩",
          keywords: ["primary", "default", "action", "enter", activePanel],
          onSelect: () => {
            const previousFocusElement = actionsPreviousFocusRef.current;
            if (previousFocusElement && previousFocusElement.isConnected) {
              previousFocusElement.focus({ preventScroll: true });
              dispatchEnterToTarget(previousFocusElement);
              return;
            }

            const activeElement =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            dispatchEnterToTarget(activeElement);
          },
        },
        ...panelSpecificRootItems,
        {
          id: `${activePanel}-back`,
          label: "Back",
          icon: <ArrowLeft className="size-4" />,
          shortcut: "Esc",
          keywords: ["back", "close", "exit", activePanel],
          onSelect: onBack,
        },
        {
          id: `${activePanel}-set-hotkey`,
          label: "Set Hotkey...",
          icon: <Keyboard className="size-4" />,
          keywords: ["shortcut", "keys", "binding", activePanel],
          nextPageId: "hotkey",
          closeOnSelect: false,
        },
        {
          id: `${activePanel}-set-alias`,
          label: "Set Alias...",
          icon: <AtSign className="size-4" />,
          keywords: ["alias", "keyword", "trigger", activePanel],
          nextPageId: "alias",
          closeOnSelect: false,
        },
      ]
    : [];

  let content: ReactNode = null;

  if (activePanel === "calculator-history") {
    content = <CalculatorHistoryCommandGroup isOpen onOpen={onOpenCalculatorHistory} />;
  } else if (activePanel === "emoji") {
    content = <EmojiCommandGroup isOpen onOpen={onOpenEmoji} onBack={onBack} />;
  } else if (activePanel === "settings") {
    content = (
      <SettingsCommandGroup
        isOpen
        onOpen={onOpenSettings}
        onBack={onBack}
        pinnedCommandIds={pinnedCommandIds}
        hiddenCommandIds={hiddenCommandIds}
        fallbackEnabled={fallbackEnabled}
        fallbackCommandIds={fallbackCommandIds}
        onSetPinned={onSetPinned}
        onSetHidden={onSetHidden}
        onMovePinned={onMovePinned}
        onSetFallbackEnabled={onSetFallbackEnabled}
        onSetFallbackCommandIds={onSetFallbackCommandIds}
      />
    );
  }

  if (!secondaryPanelIsOpen) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<SecondaryPanelFallback />}>
        <div className="animate-in fade-in zoom-in-[0.985] duration-200">{content}</div>
      </Suspense>
      <LauncherActionsPanel
        open={actionsOpen}
        onOpenChange={handleActionsOpenChange}
        rootTitle={`${panelRegistration?.title ?? "Module"} Actions...`}
        rootSearchPlaceholder="Search for actions..."
        rootItems={sharedRootItems}
        targetCommandId={panelRegistration?.id}
        targetCommandTitle={panelRegistration?.title}
        containerClassName="bottom-14 right-4"
      />
    </div>
  );
}
