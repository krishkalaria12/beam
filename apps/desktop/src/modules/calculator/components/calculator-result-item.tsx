import { Calculator, Copy, Equal } from "lucide-react";

import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import numWords from "@/lib/num-to-words";

function getCalculationKind(query: string) {
  const normalized = query.toLowerCase();

  if (normalized.includes(" to ")) {
    return "Conversion";
  }
  if (normalized.includes("time")) {
    return "Time";
  }
  if (normalized.includes("*")) {
    return "Product";
  }
  if (normalized.includes("/")) {
    return "Quotient";
  }
  if (normalized.includes("+") || normalized.includes("plus")) {
    return "Sum";
  }
  if (normalized.includes("-") || normalized.includes("minus")) {
    return "Difference";
  }
  if (normalized.includes("%")) {
    return "Percentage";
  }

  return "Result";
}

export type CalculatorResultItemProps = {
  commandValue: string;
  calculatorQuery: string;
  calculatorResult: string;
  shortcutText: string;
  isDisabled: boolean;
  onActivate: () => void;
};

export function CalculatorResultItem({
  commandValue,
  calculatorQuery,
  calculatorResult,
  shortcutText,
  isDisabled,
  onActivate,
}: CalculatorResultItemProps) {
  const calculationKind = getCalculationKind(calculatorQuery);

  let textRepresentation: string | null = null;
  try {
    const cleanValue = calculatorResult.replace(/,/g, "");
    if (!Number.isNaN(Number(cleanValue))) {
      const words = numWords(cleanValue);
      textRepresentation = words.charAt(0).toUpperCase() + words.slice(1);
    }
  } catch {
    // no-op: keep compact card when text conversion fails
  }

  return (
    <CommandItem
      value={commandValue}
      disabled={isDisabled}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onActivate();
      }}
      className="calc-result-card group bg-transparent! p-0 aria-selected:bg-transparent! [&>svg:last-child]:hidden"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl p-5 transition-all duration-200",
          "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]",
          "group-data-[selected=true]:bg-[var(--launcher-card-hover-bg)] group-data-[selected=true]:ring-[var(--launcher-card-border)]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="size-6 rounded-lg bg-[var(--launcher-card-bg)] p-1">
            <Calculator className="size-full text-[var(--icon-orange-fg)]" />
          </div>
          <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Calculator
          </span>
          <span className="text-launcher-2xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {shortcutText}
          </span>
        </div>

        {/* Expression and Result */}
        <div className="flex items-center justify-center gap-4 mb-5">
          {/* Expression */}
          <div className="min-w-0 max-w-[40%]">
            <p className="truncate text-center font-mono text-launcher-3xl font-medium tracking-[-0.01em] text-muted-foreground">
              {calculatorQuery || "Expression"}
            </p>
          </div>

          {/* Equals sign */}
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)]">
            <Equal className="size-4 text-muted-foreground" />
          </div>

          {/* Result */}
          <div className="min-w-0 max-w-[40%]">
            <p className="truncate text-center font-mono text-[calc(var(--beam-font-size-base)*2.4615)] font-bold tracking-[-0.02em] text-foreground">
              {calculatorResult}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-2">
          {/* Calculation kind tag */}
          <span className="inline-flex items-center rounded-full bg-[var(--icon-orange-bg)] px-2.5 py-1 text-launcher-2xs font-medium text-[var(--icon-orange-fg)]">
            {calculationKind}
          </span>

          {/* Text representation tag */}
          {textRepresentation && (
            <span className="inline-flex max-w-[200px] items-center truncate rounded-full bg-[var(--launcher-card-hover-bg)] px-2.5 py-1 text-launcher-2xs font-medium text-muted-foreground">
              {textRepresentation}
            </span>
          )}

          {/* Copy hint on selection */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-[var(--ring)]/15 px-2.5 py-1 text-launcher-2xs font-medium text-[var(--ring)] transition-all duration-200",
              "opacity-0 scale-95 group-data-[selected=true]:opacity-100 group-data-[selected=true]:scale-100",
            )}
          >
            <Copy className="size-3" />
            Copy
          </span>
        </div>
      </div>
    </CommandItem>
  );
}
