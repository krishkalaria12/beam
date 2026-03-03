import { ArrowRight, Check, Copy } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CalculatorHistoryEntry } from "../api/get-calculator-history";

type CalculatorHistoryItemProps = {
  entry: CalculatorHistoryEntry;
  index: number;
  isCopied: boolean;
  onSelect: () => void;
};

export function CalculatorHistoryItem({
  entry,
  index,
  isCopied,
  onSelect,
}: CalculatorHistoryItemProps) {
  return (
    <CommandItem
      value={`calculator-history-${index}`}
      className="calc-history-item group relative rounded-xl p-0 overflow-hidden data-[selected=true]:bg-[var(--launcher-card-hover-bg)]"
      onSelect={onSelect}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200",
          "bg-[var(--launcher-card-hover-bg)] opacity-0 group-data-[selected=true]:opacity-100",
        )}
      />

      <div className="w-full px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Expression */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[13px] font-medium tracking-[-0.01em] text-foreground/60 group-data-[selected=true]:text-foreground/80">
              {entry.query}
            </p>
          </div>

          {/* Arrow */}
          <ArrowRight className="size-3.5 shrink-0 text-foreground/20 group-data-[selected=true]:text-foreground/40" />

          {/* Result */}
          <div className="min-w-0 flex items-center gap-3">
            {/* Copy hint - shows on selection */}
            <span
              className={cn(
                "hidden sm:flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] transition-all duration-200",
                "opacity-0 translate-x-2 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0",
                isCopied ? "text-emerald-400" : "text-foreground/40",
              )}
            >
              {isCopied ? (
                <>
                  <Check className="size-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy
                </>
              )}
            </span>

            {/* Result value */}
            <p className="truncate font-mono text-[18px] font-bold tracking-[-0.02em] text-foreground/90">
              {entry.result}
            </p>
          </div>
        </div>
      </div>
    </CommandItem>
  );
}
