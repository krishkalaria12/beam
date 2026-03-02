import { Check, Maximize2, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiLayout } from "../hooks/use-ui-layout";

interface LayoutOption {
  id: "expanded" | "compressed";
  icon: React.ElementType;
  title: string;
  description: string;
  preview: string[];
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "expanded",
    icon: Maximize2,
    title: "Expanded",
    description: "Comfortable spacing with room to breathe",
    preview: ["━━━━━━━━", "━━━━━━", "━━━━━━━━━"],
  },
  {
    id: "compressed",
    icon: Minimize2,
    title: "Compressed",
    description: "Compact layout showing more content",
    preview: ["━━━━", "━━━", "━━━━━", "━━━"],
  },
];

export function LayoutSettings() {
  const { layoutMode, setMode } = useUiLayout();

  return (
    <div className="settings-panel px-4 py-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Density
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {LAYOUT_OPTIONS.map((option) => {
          const isSelected = layoutMode === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={cn(
                "layout-option-card group relative w-full flex items-start gap-4",
                "p-4 rounded-xl text-left",
                "transition-all duration-200",
                isSelected
                  ? "bg-white/[0.08] ring-1 ring-white/20"
                  : "bg-white/[0.02] hover:bg-white/[0.05]",
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl shrink-0",
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

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[14px] font-semibold tracking-[-0.02em]",
                    isSelected ? "text-white" : "text-white/80",
                  )}
                >
                  {option.title}
                </p>
                <p className="text-[12px] text-white/40 mt-0.5">{option.description}</p>

                {/* Visual preview */}
                <div
                  className={cn("mt-3 space-y-1.5", option.id === "compressed" ? "space-y-1" : "")}
                >
                  {option.preview.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full bg-white/10",
                        option.id === "compressed" ? "h-1" : "",
                      )}
                      style={{ width: `${40 + ((i * 15) % 40)}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div
                  className="absolute top-3.5 right-3.5 size-5 rounded-full 
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

      {/* Info */}
      <p className="text-[12px] text-white/35 px-1 leading-relaxed">
        Changes how much content fits on screen. Choose expanded for readability or compressed to
        see more items at once.
      </p>
    </div>
  );
}
