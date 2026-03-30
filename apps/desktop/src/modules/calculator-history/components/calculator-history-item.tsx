import { ArrowRight, Check, Copy } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { CalculatorHistoryEntry } from "../api/get-calculator-history";

type CalculatorHistoryItemProps = {
  entry: CalculatorHistoryEntry;
  index: number;
  isCopied: boolean;
  onSelect: () => void;
  onActivate: () => void;
};

export function CalculatorHistoryItem({
  entry,
  index,
  isCopied,
  onSelect,
  onActivate,
}: CalculatorHistoryItemProps) {
  return (
    <CommandItem
      value={`calculator-history-${entry.timestamp}`}
      className="calc-history-item group relative overflow-hidden rounded-xl p-0 data-[selected=true]:bg-[var(--launcher-card-hover-bg)]"
      onSelect={onSelect}
      onPointerEnter={onActivate}
      onFocus={onActivate}
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
            <p className="truncate font-mono text-launcher-md font-medium tracking-[-0.01em] text-muted-foreground">
              {entry.query}
            </p>
          </div>

          {/* Arrow */}
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground group-data-[selected=true]:text-muted-foreground" />

          {/* Result */}
          <div className="min-w-0 flex items-center gap-3">
            {/* Copy hint - shows on selection */}
            <span
              className={cn(
                "hidden sm:flex items-center gap-1.5 text-launcher-2xs font-medium uppercase tracking-[0.06em] transition-all duration-200",
                "translate-x-2 opacity-0 group-data-[selected=true]:translate-x-0 group-data-[selected=true]:opacity-100",
                isCopied ? "text-[var(--icon-green-fg)]" : "text-muted-foreground",
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
            <p className="truncate font-mono text-launcher-3xl font-bold tracking-[-0.02em] text-foreground">
              {entry.result}
            </p>
          </div>
        </div>
      </div>
    </CommandItem>
  );
}
