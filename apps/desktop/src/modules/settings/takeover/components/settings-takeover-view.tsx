import { Blocks, ChevronLeft, Info, Keyboard, Settings } from "lucide-react";
import { lazy, Suspense, useEffectEvent, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
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

const GeneralTab = lazy(() =>
  import("@/modules/settings/takeover/tabs/general/general-tab").then((mod) => ({
    default: mod.GeneralTab,
  })),
);
const ExtensionsTab = lazy(() =>
  import("@/modules/settings/takeover/tabs/extensions/extensions-tab").then((mod) => ({
    default: mod.ExtensionsTab,
  })),
);
const KeybindsTab = lazy(() =>
  import("@/modules/settings/takeover/tabs/keybinds/keybinds-tab").then((mod) => ({
    default: mod.KeybindsTab,
  })),
);
const AboutTab = lazy(() =>
  import("@/modules/settings/takeover/tabs/about/about-tab").then((mod) => ({
    default: mod.AboutTab,
  })),
);

function SettingsTakeoverPlaceholder() {
  return (
    <div className="settings-content flex h-full min-h-0 flex-1 flex-col gap-5 px-6 py-6">
      <div className="mx-auto w-full max-w-[820px] space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 rounded-xl bg-[var(--launcher-card-hover-bg)]" />
          <Skeleton className="h-4 w-64 rounded-lg bg-[var(--launcher-card-hover-bg)]" />
        </div>
        <div className="rounded-2xl bg-[var(--launcher-card-hover-bg)] p-5 ring-1 ring-[var(--launcher-card-border)]">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-[116px] rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-[116px] rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-[116px] rounded-xl bg-[var(--launcher-card-bg)]" />
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--launcher-card-hover-bg)] p-5 ring-1 ring-[var(--launcher-card-border)]">
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-10 rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-10 rounded-xl bg-[var(--launcher-card-bg)]" />
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--launcher-card-hover-bg)] p-5 ring-1 ring-[var(--launcher-card-border)]">
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-12 rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-12 rounded-xl bg-[var(--launcher-card-bg)]" />
            <Skeleton className="h-12 rounded-xl bg-[var(--launcher-card-bg)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [phase, setPhase] = useState<"ready" | "closing">("ready");

  useMountEffect(() => {
    if (!extensionTarget) {
      setActiveTab("general");
    }
  });

  function handleBack() {
    if (phase === "closing") {
      return;
    }

    setPhase("closing");
    window.setTimeout(() => {
      onBack();
    }, 110);
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

  return (
    <LauncherTakeoverSurface className="h-full w-full backdrop-blur-sm">
      <div
        className={cn(
          "beam-takeover-shell flex h-full w-full flex-col overflow-hidden border border-[var(--launcher-card-border)]",
          "transition-[opacity,transform] duration-140 ease-out",
          phase === "closing" ? "opacity-0 scale-[0.988]" : "opacity-100",
        )}
      >
        {/* ── Settings navbar ── */}
        <div className="settings-navbar relative flex h-[72px] shrink-0 items-center border-b border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)]/50 px-5">
          {/* Back button */}
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

          {/* Tab bar */}
          <div className="settings-tab-bar mx-auto flex items-center gap-1 rounded-2xl bg-[var(--launcher-card-bg)]/60 p-1 ring-1 ring-[var(--launcher-card-border)]">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={phase === "closing"}
                  onClick={() => setActiveTab(tab.id)}
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

                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="settings-tab-indicator absolute -bottom-[5px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-[var(--ring)] opacity-80" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex h-full min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<SettingsTakeoverPlaceholder />}>
            {activeTab === "general" ? (
              <GeneralTab
                pinnedCommandIds={pinnedCommandIds}
                hiddenCommandIds={hiddenCommandIds}
                onSetPinned={onSetPinned}
                onSetHidden={onSetHidden}
                onMovePinned={onMovePinned}
              />
            ) : null}
            {activeTab === "extensions" ? (
              <ExtensionsTab
                isActive
                hiddenCommandIds={hiddenCommandIds}
                aliasesById={aliasesById}
                onSetHidden={onSetHidden}
                onSetAliases={onSetAliases}
              />
            ) : null}
            {activeTab === "keybinds" ? <KeybindsTab isActive /> : null}
            {activeTab === "about" ? <AboutTab /> : null}
          </Suspense>
        </div>
      </div>
    </LauncherTakeoverSurface>
  );
}
