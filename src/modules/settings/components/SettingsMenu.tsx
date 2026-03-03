import { AtSign, ChevronRight, Keyboard, Layers, Pin, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SettingsView } from "../constants";

interface SettingsMenuProps {
  setView: (view: SettingsView) => void;
}

interface SettingsMenuItem {
  id: SettingsView;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
}

const SETTINGS_ITEMS: SettingsMenuItem[] = [
  {
    id: "style",
    icon: Sparkles,
    title: "Visual Style",
    description: "Appearance and theme",
    accentColor: "from-violet-500/20 to-fuchsia-500/20",
  },
  {
    id: "layout",
    icon: Layers,
    title: "UI Density",
    description: "Spacing and sizing",
    accentColor: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: "pinned",
    icon: Pin,
    title: "Pinned Commands",
    description: "Quick access items",
    accentColor: "from-amber-500/20 to-orange-500/20",
  },
  {
    id: "hotkeys",
    icon: Keyboard,
    title: "Hotkeys",
    description: "Keyboard shortcuts",
    accentColor: "from-rose-500/20 to-pink-500/20",
  },
  {
    id: "trigger-symbols",
    icon: AtSign,
    title: "Trigger Symbols",
    description: "Command prefixes",
    accentColor: "from-indigo-500/20 to-purple-500/20",
  },
];

export function SettingsMenu({ setView }: SettingsMenuProps) {
  return (
    <div className="settings-menu px-3 py-3">
      <div className="space-y-1">
        {SETTINGS_ITEMS.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "settings-menu-item group relative w-full flex items-center gap-3.5",
              "px-3 py-3.5 rounded-xl",
              "transition-all duration-200 ease-out",
              "hover:bg-[var(--launcher-card-hover-bg)]",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--launcher-card-selected-border)]",
            )}
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {/* Accent bar on hover */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 rounded-full
                bg-gradient-to-b from-white/40 to-white/10
                group-hover:h-8 transition-all duration-200 ease-out"
            />

            {/* Icon container */}
            <div
              className={cn(
                "relative flex size-11 items-center justify-center rounded-xl",
                "bg-gradient-to-br",
                item.accentColor,
                "transition-transform duration-200",
                "group-hover:scale-105",
              )}
            >
              <item.icon className="size-5 text-foreground/70 group-hover:text-foreground/90 transition-colors" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-[14px] font-semibold text-foreground/90 tracking-[-0.02em]
                group-hover:text-foreground transition-colors"
              >
                {item.title}
              </p>
              <p
                className="text-[12px] text-foreground/40 tracking-[-0.01em]
                group-hover:text-foreground/50 transition-colors"
              >
                {item.description}
              </p>
            </div>

            {/* Chevron */}
            <ChevronRight
              className="size-4 text-foreground/20 
                group-hover:text-foreground/40 group-hover:translate-x-0.5
                transition-all duration-200"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
