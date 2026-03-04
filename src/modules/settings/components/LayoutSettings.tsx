import { Check, Maximize2, Minimize2 } from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Density
        </span>
        <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {LAYOUT_OPTIONS.map((option) => {
          const isSelected = layoutMode === option.id;
          const Icon = option.icon;

          return (
            <Button
              key={option.id}
              type="button"
              variant="ghost"
              data-selected={isSelected}
              onClick={() => setMode(option.id)}
              className={cn(
                "layout-option-card group relative h-auto min-h-[108px] w-full items-start justify-start gap-4",
                "rounded-xl p-4 text-left",
                "transition-all duration-200",
                isSelected
                  ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                  : "bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
              )}
            >
              {/* Icon */}
              <IconChip
                variant={option.id === "expanded" ? "primary" : "cyan"}
                size="lg"
                className={cn(
                  "size-11 rounded-xl shrink-0 transition-all duration-200",
                  !isSelected && "opacity-70",
                )}
              >
                <Icon className="size-5 transition-colors" />
              </IconChip>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[14px] font-semibold tracking-[-0.02em]",
                    isSelected ? "text-secondary-foreground" : "text-foreground",
                  )}
                >
                  {option.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px]",
                    isSelected ? "text-secondary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {option.description}
                </p>

                {/* Visual preview */}
                <div
                  className={cn("mt-3 space-y-1.5", option.id === "compressed" ? "space-y-1" : "")}
                >
                  {option.preview.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full",
                        isSelected ? "bg-secondary-foreground/35" : "bg-[var(--launcher-chip-bg)]",
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

      {/* Info */}
      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Changes how much content fits on screen. Choose expanded for readability or compressed to
        see more items at once.
      </p>
    </div>
  );
}
