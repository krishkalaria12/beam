import { ArrowRight, Copy } from "lucide-react";

import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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

function getCalculationLabels(query: string) {
  const normalized = query.toLowerCase();

  if (
    normalized.includes(" to ") ||
    normalized.includes(" in ") ||
    normalized.includes(" into ") ||
    normalized.includes(" as ")
  ) {
    return { input: "From", result: "To" };
  }

  if (normalized.includes("time")) {
    return { input: "From", result: "To" };
  }

  return { input: "Expression", result: "Result" };
}

type CalculatorResultItemProps = {
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
  shortcutText: _shortcutText,
  isDisabled,
  onActivate,
}: CalculatorResultItemProps) {
  const calculationKind = getCalculationKind(calculatorQuery);
  const labels = getCalculationLabels(calculatorQuery);

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
          "relative w-full overflow-hidden rounded-[22px] border px-5 py-3.5 transition-colors duration-200",
          "bg-transparent border-[color-mix(in_srgb,var(--launcher-card-border)_70%,transparent)]",
          "hover:border-[color-mix(in_srgb,var(--launcher-card-selected-border)_52%,transparent)]",
          "group-data-[selected=true]:border-[color-mix(in_srgb,var(--launcher-card-selected-border)_75%,transparent)]",
        )}
      >
        <div className="relative">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="inline-flex h-6 items-center rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--icon-orange-fg)] leading-none">
                {calculationKind}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 text-[0.78rem] font-medium tracking-[-0.01em] text-muted-foreground sm:flex">
              <Copy className="size-3.5" />
              <span>Copy result</span>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--launcher-chip-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--launcher-chip-bg)_42%,transparent)]">
            <ArrowRight className="size-[14px] text-muted-foreground/90" />
          </div>

          <div className="grid min-h-[74px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-start gap-x-2">
            <div className="min-w-0 text-center">
              <div className="truncate text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                {labels.input}
              </div>
              <div
                className="mx-auto mt-1.5 max-w-[18rem] pt-0.5 pb-1 text-[1.16rem] leading-[1.24] font-medium tracking-[-0.022em] text-[color-mix(in_srgb,var(--foreground)_84%,var(--muted-foreground)_16%)]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textAlign: "center",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                }}
              >
                {calculatorQuery || "Expression"}
              </div>
            </div>

            <div />

            <div className="min-w-0 text-center">
              <div className="truncate text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                {labels.result}
              </div>
              <div
                className="mx-auto mt-1.5 max-w-[18rem] pt-0.5 pb-1 text-[1.66rem] leading-[1.14] font-semibold tracking-[-0.03em] text-foreground"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textAlign: "center",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                }}
              >
                {calculatorResult}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommandItem>
  );
}
