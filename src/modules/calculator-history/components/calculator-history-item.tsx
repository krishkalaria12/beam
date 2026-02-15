import { ArrowRight, Check } from "lucide-react";
import { CommandItem, CommandShortcut } from "@/components/ui/command";
import type { CalculatorHistoryEntry } from "../api/get-calculator-history";

type CalculatorHistoryItemProps = {
  entry: CalculatorHistoryEntry;
  index: number;
  isCopied: boolean;
  onSelect: () => void;
};

export function CalculatorHistoryItem({ entry, index, isCopied, onSelect }: CalculatorHistoryItemProps) {
  return (
    <CommandItem
      value={`calculator-history-${index}`}
      className="group rounded-xl p-0 overflow-hidden"
      onSelect={onSelect}
    >
      <div className="w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-base font-medium text-foreground/70">
              {entry.query}
            </p>
          </div>

          <ArrowRight className="size-4 text-muted-foreground/30" />

          <div className="min-w-0 text-right">
            <p className="truncate font-mono text-xl font-bold tracking-tight text-foreground">
              {entry.result}
            </p>
          </div>
        </div>
      </div>

      <CommandShortcut className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 group-data-selected:text-foreground/50 opacity-0 group-data-selected:opacity-100 transition-opacity">
        {isCopied ? (
          <Check className="size-4 text-emerald-500 animate-in zoom-in" />
        ) : (
          "copy result"
        )}
      </CommandShortcut>
    </CommandItem>
  );
}
