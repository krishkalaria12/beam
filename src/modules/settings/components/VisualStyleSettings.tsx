import { Check, Layers, Loader2, PaintBucket, RefreshCw, Sparkles } from "lucide-react";

import { useUiStyle, type UiStylePreference } from "@/components/ui-style-provider";
import { cn } from "@/lib/utils";
import { useLauncherTheme } from "@/modules/settings/hooks/use-launcher-theme";

interface StyleOption {
  id: UiStylePreference;
  icon: React.ElementType;
  title: string;
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: "default", icon: PaintBucket, title: "Default", description: "System appearance" },
  { id: "glassy", icon: Sparkles, title: "Glassy", description: "Blur and transparency" },
  { id: "solid", icon: Layers, title: "Solid", description: "Opaque surfaces" },
];

export function VisualStyleSettings() {
  const { uiStyle, setUiStyle } = useUiStyle();
  const { themes, selectedThemeId, isLoading, error, refresh, setTheme } = useLauncherTheme();

  return (
    <div className="settings-panel px-4 py-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Theme
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* Style Options */}
      <div className="grid grid-cols-3 gap-2.5">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = uiStyle === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setUiStyle(option.id)}
              className={cn(
                "settings-style-card group relative flex flex-col items-center gap-2.5",
                "py-5 px-3 rounded-xl",
                "transition-all duration-200",
                isSelected
                  ? "bg-white/[0.08] ring-1 ring-white/20"
                  : "bg-white/[0.02] hover:bg-white/[0.05]",
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  "transition-all duration-200",
                  isSelected ? "bg-[var(--solid-accent,#4ea2ff)]/20" : "bg-white/[0.04]",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 transition-colors",
                    isSelected ? "text-[var(--solid-accent,#4ea2ff)]" : "text-white/50",
                  )}
                />
              </div>

              {/* Text */}
              <div className="text-center">
                <p
                  className={cn(
                    "text-[13px] font-semibold tracking-[-0.02em]",
                    isSelected ? "text-white" : "text-white/75",
                  )}
                >
                  {option.title}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">{option.description}</p>
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div
                  className="absolute top-2.5 right-2.5 size-5 rounded-full 
                  bg-[var(--solid-accent,#4ea2ff)] flex items-center justify-center
                  shadow-lg shadow-[var(--solid-accent,#4ea2ff)]/30"
                >
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p className="text-[12px] text-white/35 px-1 leading-relaxed">
        Choose how Beam appears. Glassy adds blur effects while solid uses opaque backgrounds.
      </p>

      <div className="flex items-center gap-3 px-1 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Custom Themes
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="inline-flex size-6 items-center justify-center rounded-md bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/80"
          aria-label="Refresh theme list"
          title="Refresh theme list"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-1 text-[12px] text-white/40">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Loading themes...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              void setTheme(null);
            }}
            className={cn(
              "w-full rounded-xl px-3 py-3 text-left transition-all duration-200",
              selectedThemeId === null
                ? "bg-white/[0.08] ring-1 ring-white/20"
                : "bg-white/[0.02] hover:bg-white/[0.05]",
            )}
          >
            <p
              className={cn(
                "text-[13px] font-semibold",
                selectedThemeId ? "text-white/75" : "text-white",
              )}
            >
              Built-in only
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Disable external theme CSS and use Beam defaults.
            </p>
          </button>

          {themes.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  void setTheme(theme.id);
                }}
                className={cn(
                  "w-full rounded-xl px-3 py-3 text-left transition-all duration-200",
                  isSelected
                    ? "bg-white/[0.08] ring-1 ring-white/20"
                    : "bg-white/[0.02] hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        isSelected ? "text-white" : "text-white/80",
                      )}
                    >
                      {theme.name}
                    </p>
                    <p className="truncate text-[11px] text-white/40 mt-0.5">
                      id: {theme.id}
                      {theme.version ? ` • v${theme.version}` : ""}
                      {theme.author ? ` • ${theme.author}` : ""}
                    </p>
                    {theme.description ? (
                      <p className="text-[11px] text-white/35 mt-1.5 line-clamp-2">
                        {theme.description}
                      </p>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--solid-accent,#4ea2ff)]/25 text-[var(--solid-accent,#4ea2ff)]">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}

          {themes.length === 0 ? (
            <p className="px-1 text-[12px] text-white/35">
              No external themes found. Add a theme folder under Beam config themes directory.
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="px-1 text-[12px] text-red-400/80">{error}</p> : null}
    </div>
  );
}
