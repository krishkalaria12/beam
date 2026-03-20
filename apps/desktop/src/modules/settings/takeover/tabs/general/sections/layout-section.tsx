import type { ElementType } from "react";
import { Check, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiLayout } from "@/modules/settings/hooks/use-ui-layout";
import { SettingsSection, SettingsHint } from "../components/settings-field";

interface LayoutOption {
  id: "expanded" | "compressed";
  icon: ElementType;
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

export function GeneralLayoutSection() {
  const { layoutMode, setMode } = useUiLayout();

  return (
    <SettingsSection
      title="Density"
      description="Control how much content fits on screen at once."
      icon={LayoutGrid}
      iconVariant="primary"
    >
      <div className="grid grid-cols-2 gap-2.5 p-5">
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
                "layout-option-card group relative h-auto w-full items-start justify-start gap-3",
                "rounded-xl p-4 text-left",
                "transition-all duration-200",
                isSelected
                  ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
                  : "bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
              )}
            >
              <IconChip
                variant={option.id === "expanded" ? "primary" : "cyan"}
                size="lg"
                className={cn(
                  "size-10 shrink-0 rounded-xl transition-all duration-200",
                  !isSelected && "opacity-70",
                )}
              >
                <Icon className="size-4.5 transition-colors" />
              </IconChip>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-launcher-md font-semibold tracking-[-0.02em]",
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

                {/* Visual preview bars */}
                <div className={cn("mt-3 space-y-1.5", option.id === "compressed" && "space-y-1")}>
                  {option.preview.map((width, i) => (
                    <div
                      key={`${option.id}:${width}`}
                      className={cn(
                        "rounded-full",
                        isSelected ? "bg-secondary-foreground/30" : "bg-[var(--launcher-chip-bg)]",
                        option.id === "compressed" ? "h-1" : "h-1.5",
                      )}
                      style={{ width: `${40 + ((i * 15) % 40)}%` }}
                    />
                  ))}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--ring)]">
                  <Check className="size-3 text-background" strokeWidth={3} />
                </div>
              )}
            </Button>
          );
        })}
      </div>
      <SettingsHint>Expanded for readability, Compressed to see more items at once.</SettingsHint>
    </SettingsSection>
  );
}
