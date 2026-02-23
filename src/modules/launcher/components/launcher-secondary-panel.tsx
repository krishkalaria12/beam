import { lazy, Suspense, type ReactNode } from "react";
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

  let content: ReactNode = null;

  if (activePanel === "calculator-history") {
    content = (
      <CalculatorHistoryCommandGroup
        isOpen
        onOpen={onOpenCalculatorHistory}
      />
    );
  } else if (activePanel === "emoji") {
    content = (
      <EmojiCommandGroup
        isOpen
        onOpen={onOpenEmoji}
        onBack={onBack}
      />
    );
  } else if (activePanel === "settings") {
    content = (
      <SettingsCommandGroup
        isOpen
        onOpen={onOpenSettings}
        onBack={onBack}
      />
    );
  }

  return (
    <Suspense fallback={<SecondaryPanelFallback />}>
      <div className="animate-in fade-in zoom-in-[0.985] duration-200">
        {content}
      </div>
    </Suspense>
  );
}
