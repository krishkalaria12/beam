import { Check, Layers, Loader2, PaintBucket, RefreshCw, Sparkles } from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLauncherTheme } from "@/modules/settings/hooks/use-launcher-theme";
import { useUiStyle, type UiStylePreference } from "@/providers/ui-style-provider";

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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Theme
        </span>
        <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
      </div>

      {/* Style Options */}
      <div className="grid grid-cols-3 gap-2.5">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = uiStyle === option.id;
          const Icon = option.icon;

          return (
            <Button
              key={option.id}
              type="button"
              variant="ghost"
              data-selected={isSelected}
              onClick={() => setUiStyle(option.id)}
              className={cn(
                "settings-style-card group relative h-auto min-h-[122px] w-full items-start justify-start",
                "rounded-xl px-3 py-4 text-left",
                "transition-all duration-200",
                isSelected
                  ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                  : "bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
              )}
            >
              {/* Icon */}
              <IconChip
                variant={
                  option.id === "default" ? "neutral" : option.id === "glassy" ? "cyan" : "primary"
                }
                size="lg"
                className={cn(
                  "size-11 rounded-xl transition-all duration-200",
                  !isSelected && "opacity-70",
                )}
              >
                <Icon className="size-5 transition-colors" />
              </IconChip>

              {/* Text */}
              <div className="min-w-0 text-left">
                <p
                  className={cn(
                    "truncate text-[13px] font-semibold tracking-[-0.02em]",
                    isSelected ? "text-secondary-foreground" : "text-foreground",
                  )}
                >
                  {option.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    isSelected ? "text-secondary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {option.description}
                </p>
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div
                  className="absolute top-2.5 right-2.5 size-5 rounded-full
                  bg-[var(--ring)] flex items-center justify-center
                  shadow-lg shadow-[var(--ring)]/30"
                >
                  <Check className="size-3 text-background" strokeWidth={3} />
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {/* Hint */}
      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Choose how Beam appears. Glassy adds blur effects while solid uses opaque backgrounds.
      </p>

      <div className="flex items-center gap-3 px-1 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Custom Themes
        </span>
        <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
        <Button
          type="button"
          onClick={() => {
            void refresh();
          }}
          size="icon-xs"
          variant="ghost"
          className="size-6 rounded-md bg-[var(--launcher-card-hover-bg)] text-muted-foreground hover:bg-[var(--launcher-card-selected-bg)] hover:text-foreground"
          aria-label="Refresh theme list"
          title="Refresh theme list"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-1 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Loading themes...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void setTheme(null);
            }}
            className={cn(
              "h-auto w-full items-start justify-start rounded-xl px-3 py-3 text-left transition-all duration-200",
              selectedThemeId === null
                ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                : "bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
            )}
          >
            <p
              className={cn(
                "text-[13px] font-semibold",
                selectedThemeId ? "text-muted-foreground" : "text-secondary-foreground",
              )}
            >
              Built-in only
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                selectedThemeId ? "text-muted-foreground" : "text-secondary-foreground/80",
              )}
            >
              Disable external theme CSS and use Beam defaults.
            </p>
          </Button>

          {themes.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            return (
              <Button
                key={theme.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  void setTheme(theme.id);
                }}
                className={cn(
                  "h-auto w-full items-start justify-start rounded-xl px-3 py-3 text-left transition-all duration-200",
                  isSelected
                    ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                    : "bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        isSelected ? "text-secondary-foreground" : "text-foreground",
                      )}
                    >
                      {theme.name}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[11px]",
                        isSelected ? "text-secondary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      id: {theme.id}
                      {theme.version ? ` • v${theme.version}` : ""}
                      {theme.author ? ` • ${theme.author}` : ""}
                    </p>
                    {theme.description ? (
                      <p
                        className={cn(
                          "mt-1.5 line-clamp-2 text-[11px]",
                          isSelected ? "text-secondary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {theme.description}
                      </p>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ring)]/25 text-[var(--ring)]">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              </Button>
            );
          })}

          {themes.length === 0 ? (
            <p className="px-1 text-[12px] text-muted-foreground">
              No external themes found. Add a theme folder under Beam config themes directory.
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="px-1 text-[12px] text-destructive">{error}</p> : null}
    </div>
  );
}
