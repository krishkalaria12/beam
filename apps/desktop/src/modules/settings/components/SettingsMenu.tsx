import {
  AtSign,
  ChevronRight,
  EyeOff,
  Keyboard,
  Layers,
  Monitor,
  Pin,
  Sparkles,
} from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SettingsMenuItem, SettingsMenuProps } from "@/modules/settings/types";

const SETTINGS_ITEMS: SettingsMenuItem[] = [
  {
    id: "style",
    icon: Sparkles,
    title: "Visual Style",
    description: "Appearance and theme",
    iconVariant: "purple",
  },
  {
    id: "layout",
    icon: Layers,
    title: "UI Density",
    description: "Spacing and sizing",
    iconVariant: "cyan",
  },
  {
    id: "pinned",
    icon: Pin,
    title: "Pinned Commands",
    description: "Quick access items",
    iconVariant: "orange",
  },
  {
    id: "command-items",
    icon: EyeOff,
    title: "Command Items",
    description: "Hide or show commands",
    iconVariant: "neutral",
  },
  {
    id: "desktop-integration",
    icon: Monitor,
    title: "Desktop Integration",
    description: "GNOME, KDE, and X11 status",
    iconVariant: "green",
  },
  {
    id: "hotkeys",
    icon: Keyboard,
    title: "Hotkeys",
    description: "Keyboard shortcuts",
    iconVariant: "red",
  },
  {
    id: "trigger-symbols",
    icon: AtSign,
    title: "Trigger Symbols",
    description: "Command prefixes",
    iconVariant: "primary",
  },
];

export function SettingsMenu({ setView }: SettingsMenuProps) {
  return (
    <div className="settings-menu px-4 py-4">
      <div className="space-y-2">
        {SETTINGS_ITEMS.map((item, index) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            onClick={() => setView(item.id)}
            className={cn(
              "settings-menu-item group relative w-full flex items-center gap-3.5",
              "h-auto min-h-[68px] rounded-xl px-3.5 py-3.5",
              "border border-transparent",
              "transition-all duration-200 ease-out",
              "hover:bg-[var(--launcher-card-hover-bg)]",
              "hover:border-[var(--launcher-card-border)]",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--launcher-card-selected-border)]",
            )}
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {/* Accent bar on hover */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 rounded-full
                bg-[var(--ring)]
                group-hover:h-9 transition-all duration-200 ease-out"
            />

            {/* Icon container */}
            <IconChip
              variant={item.iconVariant}
              size="lg"
              className={cn(
                "size-11 rounded-xl transition-transform duration-200 group-hover:scale-105",
              )}
            >
              <item.icon className="size-5" />
            </IconChip>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-[14px] font-semibold text-foreground tracking-[-0.02em]
                leading-[1.2] transition-colors"
              >
                {item.title}
              </p>
              <p className="mt-1 text-[12px] leading-[1.25] text-muted-foreground tracking-[-0.01em] transition-colors">
                {item.description}
              </p>
            </div>

            {/* Chevron */}
            <ChevronRight
              className="size-4 text-muted-foreground
                group-hover:text-foreground group-hover:translate-x-0.5
                shrink-0 transition-all duration-200"
            />
          </Button>
        ))}
      </div>
    </div>
  );
}
