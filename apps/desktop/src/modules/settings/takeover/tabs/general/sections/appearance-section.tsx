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

import { IconChip, SearchableDropdown, type SearchableDropdownSection } from "@/components/module";
import { Button } from "@/components/ui/button";
import {
  SelectItem,
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LAUNCHER_FONT_FAMILY,
  LAUNCHER_FONT_SIZE_PRESETS,
  SYSTEM_LAUNCHER_FONT_FAMILY,
  getLauncherFontSizePreset,
} from "@/modules/settings/api/launcher-font";
import { useIconTheme } from "@/modules/settings/hooks/use-icon-theme";
import { useLauncherFont } from "@/modules/settings/hooks/use-launcher-font";
import { useLauncherOpacity } from "@/modules/settings/hooks/use-launcher-opacity";
import { useLauncherTheme } from "@/modules/settings/hooks/use-launcher-theme";
import {
  MAX_LAUNCHER_OPACITY,
  MIN_LAUNCHER_OPACITY,
} from "@/modules/settings/api/launcher-opacity";
import { useUiStyle, type UiStylePreference } from "@/providers/ui-style-provider";

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
  const { themes, selectedThemeId, isLoading, error, refresh, setTheme } = useLauncherTheme();
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
  const {
    families,
    selectedFamilyId,
    fontSize,
    isLoading: fontLoading,
    error: fontError,
    setFontFamily,
    setFontSize,
  } = useLauncherFont();
  const fontSections: SearchableDropdownSection[] = [
    {
      title: "Built-ins",
      items: families
        .filter(
          (family) =>
            family.id === DEFAULT_LAUNCHER_FONT_FAMILY || family.id === SYSTEM_LAUNCHER_FONT_FAMILY,
        )
        .map((family) => ({
          value: family.id,
          title: family.name,
        })),
    },
    {
      title: "Installed Fonts",
      items: families
        .filter(
          (family) =>
            family.id !== DEFAULT_LAUNCHER_FONT_FAMILY && family.id !== SYSTEM_LAUNCHER_FONT_FAMILY,
        )
        .map((family) => ({
          value: family.id,
          title: family.name,
          keywords: family.name,
        })),
    },
  ].filter((section) => section.items.length > 0);
  const selectedFontSizePreset = getLauncherFontSizePreset(fontSize);

  return (
    <div className="settings-panel space-y-5 rounded-2xl bg-[var(--launcher-card-hover-bg)] px-4 py-5 ring-1 ring-[var(--launcher-card-border)]">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                    "truncate text-launcher-md font-semibold tracking-[-0.02em]",
                    isSelected ? "text-secondary-foreground" : "text-foreground",
                  )}
                >
                  {option.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-launcher-xs",
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
      <p className="px-1 text-launcher-sm leading-relaxed text-muted-foreground">
        Choose how Beam appears. Glassy adds blur effects while solid uses opaque backgrounds.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.9fr)]">
        <div className="rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-launcher-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Typography
              </p>
              <p className="text-launcher-md mt-1 text-foreground">
                Set the launcher font family and scale Beam&apos;s base text size.
              </p>
            </div>
            <IconChip variant="neutral" size="md" className="rounded-xl">
              <PaintBucket className="size-4" />
            </IconChip>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
            <div className="space-y-3 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)]/35 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-launcher-sm font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  Font Family
                </span>
                <span className="text-launcher-xs rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-1 text-muted-foreground">
                  {selectedFamilyId === DEFAULT_LAUNCHER_FONT_FAMILY
                    ? "Beam"
                    : selectedFamilyId === SYSTEM_LAUNCHER_FONT_FAMILY
                      ? "System"
                      : "Custom"}
                </span>
              </div>

              <SearchableDropdown
                sections={fontSections}
                value={selectedFamilyId}
                disabled={fontLoading}
                onValueChange={(value) => {
                  void setFontFamily(value);
                }}
                placeholder="Choose a font"
                searchPlaceholder="Search installed fonts..."
                triggerClassName="h-11 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-md text-foreground"
                panelClassName="sc-actions-panel rounded-2xl border border-[var(--actions-panel-border)] bg-[var(--actions-panel-bg)] p-1 text-foreground shadow-2xl"
              />

              <p className="text-launcher-xs text-muted-foreground">
                Beam Default keeps the current Manrope stack. System Default follows the OS UI font.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)]/35 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-launcher-sm font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  Font Size
                </span>
                <span className="text-launcher-sm rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-1 font-mono text-foreground">
                  {selectedFontSizePreset.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {LAUNCHER_FONT_SIZE_PRESETS.map((preset) => {
                  const isSelected = preset.id === selectedFontSizePreset.id;

                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="ghost"
                      disabled={fontLoading}
                      onClick={() => {
                        void setFontSize(preset.size);
                      }}
                      className={cn(
                        "h-10 rounded-xl border px-3 text-launcher-sm font-medium transition-all duration-200",
                        isSelected
                          ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)] text-foreground"
                          : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground",
                      )}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>

              <p className="text-launcher-xs text-muted-foreground">
                Small uses a denser launcher, Default matches Beam&apos;s baseline, and Large
                improves readability.
              </p>
            </div>
          </div>

          {fontError ? <p className="text-launcher-xs mt-3 text-destructive">{fontError}</p> : null}
        </div>

        <div className="rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-launcher-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Window Opacity
              </p>
              <p className="mt-1 text-launcher-md text-foreground">
                Tune backdrop strength without softening text.
              </p>
            </div>
            <IconChip variant="cyan" size="md" className="rounded-xl">
              <Droplets className="size-4" />
            </IconChip>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)]/35 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-launcher-sm uppercase tracking-[0.08em] text-muted-foreground">
                Surface Alpha
              </span>
              <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-1 font-mono text-launcher-sm text-foreground">
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
            <div className="mt-3 flex items-center justify-between text-launcher-xs text-muted-foreground">
              <span>Invisible</span>
              <span>Opaque</span>
            </div>
          </div>
          {opacityError ? (
            <p className="mt-3 text-launcher-xs text-destructive">{opacityError}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-launcher-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                System Icon Theme
              </p>
              <p className="mt-1 text-launcher-md text-foreground">
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
              <SelectTrigger className="h-11 w-full rounded-xl border-[var(--launcher-card-border)] bg-[var(--command-item-selected-bg)] px-3 text-launcher-md text-foreground">
                <SelectValue placeholder="Choose icon theme" />
              </SelectTrigger>
              <SelectContent className="sc-actions-panel rounded-2xl border-[var(--actions-panel-border)] bg-[var(--actions-panel-bg)] p-1 text-foreground shadow-2xl">
                <SelectItem
                  value="auto"
                  className="rounded-xl px-3 py-2.5 text-launcher-md text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
                >
                  Auto
                </SelectItem>
                {iconThemes.map((theme) => (
                  <SelectItem
                    key={theme.id}
                    value={theme.id}
                    className="rounded-xl px-3 py-2.5 text-launcher-md text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span className="truncate">{theme.name}</span>
                      <span className="font-mono text-launcher-2xs uppercase tracking-[0.08em] text-muted-foreground">
                        {theme.id}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between text-launcher-xs text-muted-foreground">
              <span>
                {iconThemesLoading ? "Scanning themes..." : `${iconThemes.length} themes found`}
              </span>
              <span>{selectedIconThemeId === "auto" ? "Following system" : "Manual override"}</span>
            </div>
          </div>
          {iconThemeError ? (
            <p className="mt-3 text-launcher-xs text-destructive">{iconThemeError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 px-1 pt-2">
        <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
        <div className="flex items-center gap-2 px-1 text-launcher-sm text-muted-foreground">
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
                "text-launcher-md font-semibold",
                selectedThemeId ? "text-muted-foreground" : "text-secondary-foreground",
              )}
            >
              Built-in only
            </p>
            <p
              className={cn(
                "mt-0.5 text-launcher-xs",
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
                    : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-launcher-md font-semibold",
                        isSelected ? "text-secondary-foreground" : "text-foreground",
                      )}
                    >
                      {theme.name}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-launcher-xs",
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
                          "mt-1.5 line-clamp-2 text-launcher-xs",
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
            <p className="px-1 text-launcher-sm text-muted-foreground">
              No external themes found. Add a theme folder under Beam config themes directory.
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="px-1 text-launcher-sm text-destructive">{error}</p> : null}
    </div>
  );
}
