import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import type { CommandPanel } from "@/command-registry/types";

const CalculatorHistoryCommandGroup = lazy(() =>
  import("@/modules/calculator-history/components/calculator-history-command-group")
);
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SettingsCommandGroup = lazy(() => import("@/modules/settings/components/settings-command-group"));

const SECONDARY_PANELS = [
  "calculator-history",
  "emoji",
  "settings",
] as const;

type SecondaryPanel = (typeof SECONDARY_PANELS)[number];

function isSecondaryPanel(panel: CommandPanel): panel is SecondaryPanel {
  return (SECONDARY_PANELS as readonly string[]).includes(panel);
}

interface SecondaryPanelRendererInput {
  onOpenCalculatorHistory: () => void;
  onOpenEmoji: () => void;
  onOpenSettings: () => void;
  onBack: () => void;
}

type SecondaryPanelRenderer = (input: SecondaryPanelRendererInput) => ReactNode;

const SECONDARY_PANEL_RENDERERS: Record<SecondaryPanel, SecondaryPanelRenderer> = {
  "calculator-history": (input) => (
    <CalculatorHistoryCommandGroup
      isOpen
      onOpen={input.onOpenCalculatorHistory}
      onBack={input.onBack}
    />
  ),
  emoji: (input) => (
    <EmojiCommandGroup
      isOpen
      onOpen={input.onOpenEmoji}
      onBack={input.onBack}
    />
  ),
  settings: (input) => (
    <SettingsCommandGroup
      isOpen
      onOpen={input.onOpenSettings}
      onBack={input.onBack}
    />
  ),
};

interface LauncherSecondaryPanelProps extends SecondaryPanelRendererInput {
  activePanel: CommandPanel;
}

function SecondaryPanelFallback() {
  return (
    <div className="flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">
      <Loader2 className="mr-2 size-3.5 animate-spin" />
      Loading...
    </div>
  );
}

export function LauncherSecondaryPanel({
  activePanel,
  onOpenCalculatorHistory,
  onOpenEmoji,
  onOpenSettings,
  onBack,
}: LauncherSecondaryPanelProps) {
  if (!isSecondaryPanel(activePanel)) {
    return null;
  }

  return (
    <Suspense fallback={<SecondaryPanelFallback />}>
      {SECONDARY_PANEL_RENDERERS[activePanel]({
        onOpenCalculatorHistory,
        onOpenEmoji,
        onOpenSettings,
        onBack,
      })}
    </Suspense>
  );
}
