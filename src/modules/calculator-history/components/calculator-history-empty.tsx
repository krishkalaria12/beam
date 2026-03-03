import { CommandItem } from "@/components/ui/command";
import { Calculator } from "lucide-react";

export function CalculatorHistoryEmpty() {
  return (
    <CommandItem disabled className="calc-history-empty px-4 py-6">
      <div className="flex flex-col items-center justify-center w-full text-center">
        {/* Icon */}
        <div className="size-12 rounded-xl bg-[var(--launcher-card-bg)] p-3 mb-3">
          <Calculator className="size-full text-[var(--icon-orange-fg)]" />
        </div>

        {/* Text */}
        <p className="text-[13px] font-medium text-muted-foreground mb-1">No history yet</p>
        <p className="text-[11px] text-muted-foreground">Your calculations will appear here</p>
      </div>
    </CommandItem>
  );
}
