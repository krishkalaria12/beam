import { ArrowLeft, AtSign, CornerDownLeft, Keyboard } from "lucide-react";
import { lazy, Suspense, useEffectEvent, useRef, useState, type ReactNode } from "react";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import {
  getPanelCommandRegistration,
  getPanelPrimaryActionLabel,
} from "@/command-registry/panel-actions-registry";
import { isLauncherActionsHotkey, listenLauncherActionsToggle } from "@/lib/launcher-actions";
import type { CommandPanel } from "@/command-registry/types";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { LauncherActionItem } from "@/modules/launcher/components/launcher-actions-panel";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { dispatchEnterToTarget } from "@/modules/launcher/helper";

const CalculatorHistoryCommandGroup = lazy(
  () => import("@/modules/calculator-history/components/calculator-history-command-group"),
);
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SECONDARY_PANELS = ["calculator-history", "emoji"] as const;

type SecondaryPanel = (typeof SECONDARY_PANELS)[number];

function isSecondaryPanel(panel: CommandPanel): panel is SecondaryPanel {
  return (SECONDARY_PANELS as readonly string[]).includes(panel);
}

interface SecondaryPanelRendererInput {
  onOpenCalculatorHistory: () => void;
  onOpenEmoji: () => void;
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
  return <CommandLoadingState label="Loading..." className="px-4 py-6 text-launcher-xs" />;
}

export function LauncherSecondaryPanel(props: LauncherSecondaryPanelProps) {
  const { activePanel } = props;
  if (!isSecondaryPanel(activePanel)) {
    return null;
  }

  return <LauncherSecondaryPanelContent key={activePanel} {...props} />;
}

function LauncherSecondaryPanelContent({
  activePanel,
  onOpenCalculatorHistory,
  onOpenEmoji,
  onBack,
  pinnedCommandIds: _pinnedCommandIds,
  hiddenCommandIds: _hiddenCommandIds,
  fallbackEnabled: _fallbackEnabled,
  fallbackCommandIds: _fallbackCommandIds,
  onSetPinned: _onSetPinned,
  onSetHidden: _onSetHidden,
  onMovePinned: _onMovePinned,
  onSetFallbackEnabled: _onSetFallbackEnabled,
  onSetFallbackCommandIds: _onSetFallbackCommandIds,
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

  const handleActionsHotkey = useEffectEvent(() => {
    if (!secondaryPanelIsOpen) {
      return;
    }

    handleActionsOpenChange(!actionsOpen);
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

  const panelSpecificRootItems: LauncherActionItem[] = [];

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
