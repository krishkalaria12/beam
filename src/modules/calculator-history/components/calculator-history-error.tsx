import { CommandItem } from "@/components/ui/command";
import { AlertTriangle } from "lucide-react";

type CalculatorHistoryErrorProps = {
  message?: string;
};

export function CalculatorHistoryError({
  message = "Could not load calculator history",
}: CalculatorHistoryErrorProps) {
  return (
    <CommandItem disabled className="calc-history-error px-4 py-4">
      <div className="flex items-center gap-3 w-full">
        {/* Icon */}
        <div className="size-9 shrink-0 rounded-lg bg-red-500/15 p-2">
          <AlertTriangle className="size-full text-red-400" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-red-300/90 truncate">{message}</p>
          <p className="text-[11px] text-white/35">Please try again later</p>
        </div>
      </div>
    </CommandItem>
  );
}
