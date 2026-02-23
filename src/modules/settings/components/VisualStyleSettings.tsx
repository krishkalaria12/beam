import { ArrowLeft, PaintBucket, Sparkles } from "lucide-react";

import { useUiStyle, type UiStylePreference } from "@/components/ui-style-provider";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface VisualStyleSettingsProps {
  onBack: () => void;
}

const BASE_COLOR_PRESETS = [
  "#101113",
  "#1f2937",
  "#0f172a",
  "#1a2e26",
  "#2e1f3a",
] as const;

export function VisualStyleSettings({ onBack }: VisualStyleSettingsProps) {
  const { uiStyle, baseColor, setUiStyle, setBaseColor } = useUiStyle();

  const setStyle = (style: UiStylePreference) => {
    setUiStyle(style);
  };

  return (
    <CommandGroup>
      <CommandItem
        value="back to settings"
        className="mb-1 opacity-60 hover:opacity-100 transition-opacity"
        onSelect={onBack}
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="size-5" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Back</span>
        </div>
      </CommandItem>

      <div className="space-y-4 px-1 pb-1">
        <div>
          <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Visual Style
          </p>
          <div className="grid grid-cols-2 gap-2 px-1">
            <button
              type="button"
              onClick={() => setStyle("default")}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
                uiStyle === "default"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                  : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                  uiStyle === "default"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background text-muted-foreground",
                )}
              >
                <PaintBucket className="size-5" />
              </div>
              <span className={cn("text-xs font-bold tracking-tight", uiStyle === "default" ? "text-foreground" : "text-muted-foreground")}>
                Default
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStyle("glassy")}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
                uiStyle === "glassy"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                  : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                  uiStyle === "glassy"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background text-muted-foreground",
                )}
              >
                <Sparkles className="size-5" />
              </div>
              <span className={cn("text-xs font-bold tracking-tight", uiStyle === "glassy" ? "text-foreground" : "text-muted-foreground")}>
                Glassy
              </span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Base Color Tint
          </p>

          <div className="space-y-2 px-1">
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/20 p-2">
              <input
                type="color"
                value={baseColor}
                onChange={(event) => {
                  setBaseColor(event.target.value);
                }}
                className="h-8 w-11 cursor-pointer rounded-md border border-border/40 bg-transparent p-0"
                aria-label="Pick base color tint"
              />
              <code className="rounded-md border border-border/40 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground">
                {baseColor}
              </code>
            </div>

            <div className="flex flex-wrap gap-2">
              {BASE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setBaseColor(preset);
                  }}
                  className={cn(
                    "h-6 w-6 rounded-md border transition-transform hover:scale-105",
                    baseColor === preset ? "border-primary ring-2 ring-primary/30" : "border-border/40",
                  )}
                  style={{ backgroundColor: preset }}
                  aria-label={`Set base tint ${preset}`}
                  title={preset}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </CommandGroup>
  );
}
