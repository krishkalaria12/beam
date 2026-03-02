import { Check, Layers, PaintBucket, Sparkles } from "lucide-react";

import { useUiStyle, type UiStylePreference } from "@/components/ui-style-provider";
import { cn } from "@/lib/utils";

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
    </div>
  );
}
