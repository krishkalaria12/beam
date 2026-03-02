import { lazy, Suspense, type ReactNode } from "react";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import type { CommandPanel } from "@/command-registry/types";

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
  fallbackEnabled: boolean;
  fallbackCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
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
  fallbackEnabled,
  fallbackCommandIds,
  onSetPinned,
  onMovePinned,
  onSetFallbackEnabled,
  onSetFallbackCommandIds,
}: LauncherSecondaryPanelProps) {
  if (!isSecondaryPanel(activePanel)) {
    return null;
  }

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
        fallbackEnabled={fallbackEnabled}
        fallbackCommandIds={fallbackCommandIds}
        onSetPinned={onSetPinned}
        onMovePinned={onMovePinned}
        onSetFallbackEnabled={onSetFallbackEnabled}
        onSetFallbackCommandIds={onSetFallbackCommandIds}
      />
    );
  }

  return (
    <Suspense fallback={<SecondaryPanelFallback />}>
      <div className="animate-in fade-in zoom-in-[0.985] duration-200">{content}</div>
    </Suspense>
  );
}
