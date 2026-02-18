import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

import { CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { useUiLayout } from "../hooks/use-ui-layout";

interface LayoutSettingsProps {
  onBack: () => void;
}

export function LayoutSettings({ onBack }: LayoutSettingsProps) {
  const { layoutMode, setMode } = useUiLayout();

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

      <div className="px-1 pb-1">
        <p className="px-2 mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          UI Density
        </p>

        <div className="grid grid-cols-2 gap-2 px-1">
          <button
            onClick={() => setMode("expanded")}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
              layoutMode === "expanded"
                ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                layoutMode === "expanded"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-background text-muted-foreground",
              )}
            >
              <Maximize2 className="size-5" />
            </div>
            <span
              className={cn(
                "text-xs font-bold tracking-tight",
                layoutMode === "expanded" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Expand UI
            </span>
          </button>

          <button
            onClick={() => setMode("compressed")}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
              layoutMode === "compressed"
                ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                layoutMode === "compressed"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-background text-muted-foreground",
              )}
            >
              <Minimize2 className="size-5" />
            </div>
            <span
              className={cn(
                "text-xs font-bold tracking-tight",
                layoutMode === "compressed" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Compress UI
            </span>
          </button>
        </div>
      </div>
    </CommandGroup>
  );
}
