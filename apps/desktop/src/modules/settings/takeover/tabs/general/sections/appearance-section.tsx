import type { ElementType } from "react";
import {
  Check,
  Droplets,
  Layers,
  Loader2,
  PaintBucket,
  Palette,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import {
  SelectItem,
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIconTheme } from "@/modules/settings/hooks/use-icon-theme";
import { useLauncherOpacity } from "@/modules/settings/hooks/use-launcher-opacity";
import { useLauncherTheme } from "@/modules/settings/hooks/use-launcher-theme";
import {
  MAX_LAUNCHER_OPACITY,
  MIN_LAUNCHER_OPACITY,
} from "@/modules/settings/api/launcher-opacity";
import {
  useUiStyle,
  type UiStylePreference,
} from "@/providers/ui-style-provider";

interface StyleOption {
  id: UiStylePreference;
  icon: ElementType;
  title: string;
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "default",
    icon: PaintBucket,
    title: "Default",
    description: "System appearance",
  },
  {
    id: "glassy",
    icon: Sparkles,
    title: "Glassy",
    description: "Blur and transparency",
  },
  { id: "solid", icon: Layers, title: "Solid", description: "Opaque surfaces" },
];

export function GeneralAppearanceSection() {
  const { uiStyle, setUiStyle } = useUiStyle();
  const { themes, selectedThemeId, isLoading, error, refresh, setTheme } =
    useLauncherTheme();
  const {
    themes: iconThemes,
    selectedThemeId: selectedIconThemeId,
    isLoading: iconThemesLoading,
    error: iconThemeError,
    setTheme: setIconTheme,
  } = useIconTheme();
  const {
    opacity,
    isLoading: opacityLoading,
    error: opacityError,
    setOpacity,
  } = useLauncherOpacity();

  return (
    <div className="settings-panel space-y-5 rounded-2xl bg-[var(--launcher-card-hover-bg)] px-4 py-5 ring-1 ring-[var(--launcher-card-border)]">
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
                  : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
              )}
            >
              {/* Icon */}
              <IconChip
                variant={
                  option.id === "default"
                    ? "neutral"
                    : option.id === "glassy"
                      ? "cyan"
                      : "primary"
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
                    isSelected
                      ? "text-secondary-foreground"
                      : "text-foreground",
                  )}
                >
                  {option.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    isSelected
                      ? "text-secondary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {option.description}
                </p>
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div
                  className="absolute top-2.5 right-2.5 size-5 rounded-full
                  bg-[var(--ring)] flex items-center justify-center"
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
        Choose how Beam appears. Glassy adds blur effects while solid uses
        opaque backgrounds.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.9fr)]">
        <div className="rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Window Opacity
              </p>
              <p className="mt-1 text-[13px] text-foreground">
                Tune backdrop strength without softening text.
              </p>
            </div>
            <IconChip variant="cyan" size="md" className="rounded-xl">
              <Droplets className="size-4" />
            </IconChip>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)]/35 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                Surface Alpha
              </span>
              <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-1 font-mono text-[12px] text-foreground">
                {opacity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_LAUNCHER_OPACITY}
              max={MAX_LAUNCHER_OPACITY}
              step={0.01}
              value={opacity}
              disabled={opacityLoading}
              aria-label="Launcher opacity"
              onChange={(event) => {
                const nextOpacity = Number(event.currentTarget.value);
                void setOpacity(nextOpacity);
              }}
              className="beam-opacity-slider mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent"
            />
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Invisible</span>
              <span>Opaque</span>
            </div>
          </div>
          {opacityError ? (
            <p className="mt-3 text-[11px] text-destructive">{opacityError}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                System Icon Theme
              </p>
              <p className="mt-1 text-[13px] text-foreground">
                Controls native app and window icons. Beam icons stay unchanged.
              </p>
            </div>
            <IconChip variant="primary" size="md" className="rounded-xl">
              <Palette className="size-4" />
            </IconChip>
          </div>

          <div className="mt-4 space-y-3">
            <Select
              value={selectedIconThemeId}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                void setIconTheme(value);
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)] px-3 text-[13px] text-foreground">
                <SelectValue placeholder="Choose icon theme" />
              </SelectTrigger>
              <SelectContent className="sc-actions-panel rounded-2xl border-[var(--actions-panel-border)] bg-[var(--actions-panel-bg)] p-1 text-foreground shadow-2xl">
                <SelectItem
                  value="auto"
                  className="rounded-xl px-3 py-2.5 text-[13px] text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
                >
                  Auto
                </SelectItem>
                {iconThemes.map((theme) => (
                  <SelectItem
                    key={theme.id}
                    value={theme.id}
                    className="rounded-xl px-3 py-2.5 text-[13px] text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span className="truncate">{theme.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        {theme.id}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {iconThemesLoading
                  ? "Scanning themes..."
                  : `${iconThemes.length} themes found`}
              </span>
              <span>
                {selectedIconThemeId === "auto"
                  ? "Following system"
                  : "Manual override"}
              </span>
            </div>
          </div>
          {iconThemeError ? (
            <p className="mt-3 text-[11px] text-destructive">
              {iconThemeError}
            </p>
          ) : null}
        </div>
      </div>

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
          className="size-6 rounded-md bg-[var(--launcher-card-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)] hover:text-foreground"
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
                : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
            )}
          >
            <p
              className={cn(
                "text-[13px] font-semibold",
                selectedThemeId
                  ? "text-muted-foreground"
                  : "text-secondary-foreground",
              )}
            >
              Built-in only
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                selectedThemeId
                  ? "text-muted-foreground"
                  : "text-secondary-foreground/80",
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
                    : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        isSelected
                          ? "text-secondary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {theme.name}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[11px]",
                        isSelected
                          ? "text-secondary-foreground/80"
                          : "text-muted-foreground",
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
                          isSelected
                            ? "text-secondary-foreground/80"
                            : "text-muted-foreground",
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
              No external themes found. Add a theme folder under Beam config
              themes directory.
            </p>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="px-1 text-[12px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
