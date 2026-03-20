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
  Type,
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
import {
  SettingsSection,
  SettingsField,
  SettingsDivider,
  SettingsSubLabel,
  SettingsHint,
} from "../components/settings-field";

/* ── Style presets ── */

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
    description: "Blur & transparency",
  },
  { id: "solid", icon: Layers, title: "Solid", description: "Opaque surfaces" },
];

function AppearanceStyleSection({
  uiStyle,
  setUiStyle,
  opacity,
  opacityLoading,
  opacityError,
  setOpacity,
}: {
  uiStyle: UiStylePreference;
  setUiStyle: (value: UiStylePreference) => void;
  opacity: number;
  opacityLoading: boolean;
  opacityError: string | null;
  setOpacity: (value: number) => Promise<void>;
}) {
  return (
    <SettingsSection
      title="Appearance"
      description="Choose your visual style, colors, and how Beam blends with your desktop."
      icon={Sparkles}
      iconVariant="cyan"
    >
      <div className="p-5">
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
                  "settings-style-card group relative h-auto min-h-[116px] w-full items-start justify-start rounded-xl px-3.5 py-4 text-left transition-all duration-200",
                  isSelected
                    ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                    : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                )}
              >
                <IconChip
                  variant={option.id === "default" ? "neutral" : option.id === "glassy" ? "cyan" : "primary"}
                  size="lg"
                  className={cn("size-10 rounded-xl transition-all duration-200", !isSelected && "opacity-70")}
                >
                  <Icon className="size-4.5 transition-colors" />
                </IconChip>
                <div className="min-w-0 text-left">
                  <p className={cn("truncate text-launcher-md font-semibold tracking-[-0.02em]", isSelected ? "text-secondary-foreground" : "text-foreground")}>{option.title}</p>
                  <p className={cn("mt-0.5 text-launcher-xs", isSelected ? "text-secondary-foreground/80" : "text-muted-foreground")}>{option.description}</p>
                </div>
                {isSelected ? (
                  <div className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--ring)]">
                    <Check className="size-3 text-background" strokeWidth={3} />
                  </div>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      <SettingsDivider />

      <SettingsField
        label="Window Opacity"
        description="Adjust backdrop transparency without affecting text clarity."
        stacked
      >
        <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-launcher-xs text-muted-foreground">Surface Alpha</span>
            <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-2.5 py-0.5 font-mono text-launcher-xs text-foreground">{opacity.toFixed(2)}</span>
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
              void setOpacity(Number(event.currentTarget.value));
            }}
            className="beam-opacity-slider mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent"
          />
          <div className="mt-2 flex items-center justify-between text-launcher-2xs text-muted-foreground">
            <span>Invisible</span>
            <span>Opaque</span>
          </div>
        </div>
        {opacityError ? <p className="text-launcher-xs text-destructive">{opacityError}</p> : null}
      </SettingsField>
    </SettingsSection>
  );
}

/* ── Component ── */

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
    <div className="space-y-4">
      {/* ─── Visual Style ─── */}
      <SettingsSection
        title="Appearance"
        description="Choose your visual style, colors, and how Beam blends with your desktop."
        icon={Sparkles}
        iconVariant="cyan"
      >
        {/* Style picker grid */}
        <div className="p-5">
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
                    "settings-style-card group relative h-auto min-h-[116px] w-full items-start justify-start",
                    "rounded-xl px-3.5 py-4 text-left",
                    "transition-all duration-200",
                    isSelected
                      ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                      : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                  )}
                >
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
                      "size-10 rounded-xl transition-all duration-200",
                      !isSelected && "opacity-70",
                    )}
                  >
                    <Icon className="size-4.5 transition-colors" />
                  </IconChip>

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

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--ring)]">
                      <Check className="size-3 text-background" strokeWidth={3} />
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <SettingsDivider />

        {/* Window Opacity */}
        <SettingsField
          label="Window Opacity"
          description="Adjust backdrop transparency without affecting text clarity."
          stacked
        >
          <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-launcher-xs text-muted-foreground">Surface Alpha</span>
              <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-2.5 py-0.5 font-mono text-launcher-xs text-foreground">
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
              className="beam-opacity-slider mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent"
            />
            <div className="mt-2 flex items-center justify-between text-launcher-2xs text-muted-foreground">
              <span>Invisible</span>
              <span>Opaque</span>
            </div>
          </div>
          {opacityError ? (
            <p className="text-launcher-xs text-destructive">{opacityError}</p>
          ) : null}
        </SettingsField>
      </SettingsSection>

      {/* ─── Typography ─── */}
      <SettingsSection
        title="Typography"
        description="Control the launcher font family and base text size."
        icon={Type}
        iconVariant="neutral"
      >
        <SettingsField
          label="Font Family"
          description="Beam Default keeps Manrope. System Default follows your OS font."
          badge={
            selectedFamilyId === DEFAULT_LAUNCHER_FONT_FAMILY
              ? "Beam"
              : selectedFamilyId === SYSTEM_LAUNCHER_FONT_FAMILY
                ? "System"
                : "Custom"
          }
          stacked
        >
          <SearchableDropdown
            sections={fontSections}
            value={selectedFamilyId}
            disabled={fontLoading}
            onValueChange={(value) => {
              void setFontFamily(value);
            }}
            placeholder="Choose a font"
            searchPlaceholder="Search installed fonts..."
            triggerClassName="h-10 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-sm text-foreground"
            panelClassName="sc-actions-panel rounded-2xl border border-[var(--actions-panel-border)] bg-[var(--actions-panel-bg)] p-1 text-foreground shadow-2xl"
          />
        </SettingsField>

        <SettingsDivider />

        <SettingsField
          label="Font Size"
          description="Small packs more content, Large improves readability."
          badge={selectedFontSizePreset.label}
          stacked
        >
          <div className="flex items-center gap-2">
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
                    "h-9 flex-1 rounded-xl border px-3 text-launcher-sm font-medium transition-all duration-200",
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
        </SettingsField>

        {fontError ? (
          <div className="px-5 pb-4">
            <p className="text-launcher-xs text-destructive">{fontError}</p>
          </div>
        ) : null}
      </SettingsSection>

      {/* ─── Icon Theme ─── */}
      <SettingsSection
        title="System Icon Theme"
        description="Choose the icon set used for native app and file type icons."
        icon={Palette}
        iconVariant="primary"
      >
        <SettingsField label="Theme" stacked>
          <Select
            value={selectedIconThemeId}
            onValueChange={(value) => {
              if (!value) return;
              void setIconTheme(value);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-sm text-foreground">
              <SelectValue placeholder="Choose icon theme" />
            </SelectTrigger>
            <SelectContent className="sc-actions-panel rounded-2xl border-[var(--actions-panel-border)] bg-[var(--actions-panel-bg)] p-1 text-foreground shadow-2xl">
              <SelectItem
                value="auto"
                className="rounded-xl px-3 py-2.5 text-launcher-sm text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
              >
                Auto
              </SelectItem>
              {iconThemes.map((theme) => (
                <SelectItem
                  key={theme.id}
                  value={theme.id}
                  className="rounded-xl px-3 py-2.5 text-launcher-sm text-foreground focus:bg-[var(--command-item-selected-bg)] focus:text-foreground"
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
          <div className="flex items-center justify-between text-launcher-2xs text-muted-foreground">
            <span>
              {iconThemesLoading ? "Scanning themes..." : `${iconThemes.length} themes found`}
            </span>
            <span>{selectedIconThemeId === "auto" ? "Following system" : "Manual override"}</span>
          </div>
        </SettingsField>

        {iconThemeError ? (
          <div className="px-5 pb-4">
            <p className="text-launcher-xs text-destructive">{iconThemeError}</p>
          </div>
        ) : null}
      </SettingsSection>

      {/* ─── Custom Themes ─── */}
      <SettingsSection
        title="Custom Themes"
        description="Load external theme CSS to fully customize Beam's appearance."
        icon={PaintBucket}
        iconVariant="orange"
        headerAction={
          <Button
            type="button"
            onClick={() => {
              void refresh();
            }}
            size="icon-xs"
            variant="ghost"
            className="size-7 rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
            aria-label="Refresh theme list"
            title="Refresh theme list"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        }
      >
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-launcher-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Loading themes...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Built-in option */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void setTheme(null);
                }}
                className={cn(
                  "h-auto w-full items-start justify-start rounded-xl px-4 py-3 text-left transition-all duration-200",
                  selectedThemeId === null
                    ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                    : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                )}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-launcher-sm font-semibold",
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
                      Use Beam default styles without external CSS.
                    </p>
                  </div>
                  {selectedThemeId === null && (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ring)]">
                      <Check className="size-3 text-background" strokeWidth={3} />
                    </span>
                  )}
                </div>
              </Button>

              {/* External themes */}
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
                      "h-auto w-full items-start justify-start rounded-xl px-4 py-3 text-left transition-all duration-200",
                      isSelected
                        ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                        : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-launcher-sm font-semibold",
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
                      {isSelected && (
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ring)]/25 text-[var(--ring)]">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}

              {themes.length === 0 && (
                <p className="py-3 text-center text-launcher-xs text-muted-foreground">
                  No external themes found. Add a theme folder under Beam config themes directory.
                </p>
              )}
            </div>
          )}
        </div>

        {error ? (
          <div className="px-5 pb-4">
            <p className="text-launcher-xs text-destructive">{error}</p>
          </div>
        ) : null}
      </SettingsSection>
    </div>
  );
}
