import type { ReactNode } from "react";

import type { CommandPanel } from "@/command-registry/types";
import CalculatorHistoryCommandGroup from "@/modules/calculator-history/components/calculator-history-command-group";
import EmojiCommandGroup from "@/modules/emoji/components/emoji-command-group";
import SettingsCommandGroup from "@/modules/settings/components/settings-command-group";

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

  return SECONDARY_PANEL_RENDERERS[activePanel]({
    onOpenCalculatorHistory,
    onOpenEmoji,
    onOpenSettings,
    onBack,
  });
}
