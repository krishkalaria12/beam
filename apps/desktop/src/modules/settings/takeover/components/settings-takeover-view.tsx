import { Blocks, ChevronLeft, Info, Keyboard, Settings } from "lucide-react";
import { useEffectEvent, useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  preloadSettingsTab,
  getLoadedSettingsTab,
} from "@/modules/settings/takeover/lib/settings-tab-loader";
import { useSettingsWindowSizer } from "@/modules/settings/takeover/hooks/use-settings-window-sizer";
import {
  type SettingsPageTab,
  useSettingsPageStore,
} from "@/modules/settings/takeover/store/use-settings-page-store";

interface SettingsTakeoverViewProps {
  onBack: () => void;
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
}

type GeneralTabProps = {
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
};

type ExtensionsTabProps = {
  isActive: boolean;
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
};

type KeybindsTabProps = {
  isActive: boolean;
};

const SETTINGS_TABS: ReadonlyArray<{
  id: SettingsPageTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "general", label: "General", icon: Settings },
  { id: "extensions", label: "Extensions", icon: Blocks },
  { id: "keybinds", label: "Keybinds", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
];

export function SettingsTakeoverView({
  onBack,
  pinnedCommandIds,
  hiddenCommandIds,
  aliasesById,
  onSetPinned,
  onSetHidden,
  onSetAliases,
  onMovePinned,
}: SettingsTakeoverViewProps) {
  useSettingsWindowSizer();

  const activeTab = useSettingsPageStore((state) => state.activeTab);
  const extensionTarget = useSettingsPageStore((state) => state.extensionTarget);
  const setActiveTab = useSettingsPageStore((state) => state.setActiveTab);
  const [phase, setPhase] = useState<"entering" | "ready" | "closing">("entering");

  useMountEffect(() => {
    if (!extensionTarget) {
      setActiveTab("general");
    }

    const raf = window.requestAnimationFrame(() => {
      setPhase("ready");
    });

    return () => window.cancelAnimationFrame(raf);
  });

  function handleBack() {
    if (phase === "closing") {
      return;
    }

    setPhase("closing");
    window.setTimeout(() => {
      onBack();
    }, 180);
  }

  async function handleTabSelect(tab: SettingsPageTab) {
    if (phase === "closing" || tab === activeTab) {
      return;
    }

    await preloadSettingsTab(tab);
    setActiveTab(tab);
  }

  function handleTabIntent(tab: SettingsPageTab) {
    if (tab === activeTab) {
      return;
    }

    void preloadSettingsTab(tab);
  }

  const handleBackHotkey = useEffectEvent(() => {
    handleBack();
  });

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleBackHotkey();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  });

  const content = renderSettingsTab({
    activeTab,
    pinnedCommandIds,
    hiddenCommandIds,
    aliasesById,
    onSetPinned,
    onSetHidden,
    onSetAliases,
    onMovePinned,
  });

  return (
    <LauncherTakeoverSurface
      className="h-full w-full backdrop-blur-sm"
      exiting={phase === "closing"}
    >
      <div
        className={cn(
          "beam-takeover-shell flex h-full w-full flex-col overflow-hidden border border-[var(--launcher-card-border)]",
          phase === "closing" ? "takeover-shell-exit" : "takeover-shell-enter",
        )}
      >
        <div className="settings-navbar relative flex h-[72px] shrink-0 items-center border-b border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)]/50 px-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={phase === "closing"}
            className="settings-back-btn absolute left-5 top-1/2 h-8 -translate-y-1/2 gap-1.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-xs text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            <span>Back</span>
          </Button>

          <div className="settings-tab-bar mx-auto flex items-center gap-1 rounded-2xl bg-[var(--launcher-card-bg)]/60 p-1 ring-1 ring-[var(--launcher-card-border)]">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={phase === "closing"}
                  onClick={() => {
                    void handleTabSelect(tab.id);
                  }}
                  onPointerEnter={() => {
                    handleTabIntent(tab.id);
                  }}
                  onFocus={() => {
                    handleTabIntent(tab.id);
                  }}
                  className={cn(
                    "settings-tab-item group relative flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-200",
                    isActive
                      ? "settings-tab-active bg-[var(--launcher-card-hover-bg)] text-foreground shadow-sm ring-1 ring-[var(--launcher-card-border)]"
                      : "text-muted-foreground hover:bg-[var(--launcher-card-bg)] hover:text-foreground",
                    phase === "closing" && "pointer-events-none opacity-70",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-colors duration-200",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-launcher-xs font-medium tracking-[0.02em] transition-colors duration-200",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive ? (
                    <span className="settings-tab-indicator absolute -bottom-[5px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-[var(--ring)] opacity-80" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-1 overflow-hidden">{content}</div>
      </div>
    </LauncherTakeoverSurface>
  );
}

function renderSettingsTab(
  input: GeneralTabProps &
    Pick<
      ExtensionsTabProps,
      "hiddenCommandIds" | "aliasesById" | "onSetHidden" | "onSetAliases"
    > & {
      activeTab: SettingsPageTab;
    },
): ReactNode {
  switch (input.activeTab) {
    case "general": {
      const GeneralTab = getLoadedSettingsTab(
        input.activeTab,
      ) as ComponentType<GeneralTabProps> | null;
      return GeneralTab ? (
        <GeneralTab
          pinnedCommandIds={input.pinnedCommandIds}
          hiddenCommandIds={input.hiddenCommandIds}
          onSetPinned={input.onSetPinned}
          onSetHidden={input.onSetHidden}
          onMovePinned={input.onMovePinned}
        />
      ) : null;
    }
    case "extensions": {
      const ExtensionsTab = getLoadedSettingsTab(
        input.activeTab,
      ) as ComponentType<ExtensionsTabProps> | null;
      return ExtensionsTab ? (
        <ExtensionsTab
          isActive
          hiddenCommandIds={input.hiddenCommandIds}
          aliasesById={input.aliasesById}
          onSetHidden={input.onSetHidden}
          onSetAliases={input.onSetAliases}
        />
      ) : null;
    }
    case "keybinds": {
      const KeybindsTab = getLoadedSettingsTab(
        input.activeTab,
      ) as ComponentType<KeybindsTabProps> | null;
      return KeybindsTab ? <KeybindsTab isActive /> : null;
    }
    case "about": {
      const AboutTab = getLoadedSettingsTab(input.activeTab) as ComponentType | null;
      return AboutTab ? <AboutTab /> : null;
    }
  }
}
