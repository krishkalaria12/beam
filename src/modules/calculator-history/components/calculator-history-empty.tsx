import { CommandItem } from "@/components/ui/command";
import { Calculator } from "lucide-react";

export function CalculatorHistoryEmpty() {
  return (
    <CommandItem disabled className="calc-history-empty px-4 py-6">
      <div className="flex flex-col items-center justify-center w-full text-center">
        {/* Icon */}
        <div className="size-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-3 mb-3">
          <Calculator className="size-full text-orange-400" />
        </div>

        {/* Text */}
        <p className="text-[13px] font-medium text-white/60 mb-1">No history yet</p>
        <p className="text-[11px] text-white/35">Your calculations will appear here</p>
      </div>
    </CommandItem>
  );
}
