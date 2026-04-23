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
      className="calc-history-item group relative overflow-hidden rounded-xl border border-transparent p-0 transition-colors data-[selected=true]:border-[color-mix(in_srgb,var(--launcher-card-selected-border)_60%,transparent)] data-[selected=true]:bg-[color-mix(in_srgb,var(--launcher-card-selected-bg)_60%,transparent)]"
      onSelect={onSelect}
      onPointerEnter={onActivate}
      onFocus={onActivate}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="w-full px-4 py-3.5">
        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[0.6875rem] leading-none text-[var(--text-muted)]">
                {isCopied ? "Copied to clipboard" : "Press Enter to copy"}
              </div>
            </div>

            <div
              className={cn(
                "hidden shrink-0 items-center gap-1 text-[0.6875rem] leading-none sm:flex",
                isCopied ? "text-[var(--icon-green-fg)]" : "text-[var(--text-subtle)]",
              )}
            >
              {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{isCopied ? "Copied" : "Copy"}</span>
            </div>
          </div>

          <div className="absolute left-1/2 top-[calc(50%+10px)] flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] text-[var(--text-muted)] pointer-events-none">
            <ArrowRight className="size-4" />
          </div>

          <div className="flex justify-center">
            <div className="inline-grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-7">
              <div className="min-w-0 text-center">
                <div
                  className="text-[1rem] font-medium leading-6 text-[var(--text-secondary)]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {entry.query}
                </div>
              </div>

              <div />

              <div className="min-w-0 text-center">
                <div
                  className="text-[1rem] font-semibold leading-6 text-foreground"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {entry.result}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommandItem>
  );
}
