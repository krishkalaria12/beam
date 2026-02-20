import { ArrowRight } from "lucide-react";

import { CommandItem } from "@/components/ui/command";
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
      className="bg-transparent! p-0 aria-selected:bg-transparent! [&>svg:last-child]:hidden"
    >
      <div className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-zinc-900/72 via-black/62 to-zinc-950/74 p-4 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl backdrop-saturate-125 transition-all duration-500 hover:border-white/18">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/7 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-center gap-3 text-center">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-100/75">
              Calculator
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-200/50">
              {shortcutText}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="min-w-0 text-center">
              <span className="block truncate text-xl font-mono font-medium tracking-tight text-zinc-100/90">
                {calculatorQuery || "Expression"}
              </span>
            </div>

            <ArrowRight className="size-4 shrink-0 text-zinc-300/45" />

            <div className="min-w-0 text-center">
              <span className="block truncate text-3xl font-mono font-bold tracking-tight text-white transition-all duration-300">
                {calculatorResult}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-zinc-100/85 ring-1 ring-inset ring-white/14 transition-colors group-hover:bg-white/14 group-hover:text-white/95">
              {calculationKind}
            </div>

            {textRepresentation ? (
              <div className="max-w-[55%] truncate text-center">
                <div className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-zinc-100/85 ring-1 ring-inset ring-white/14 transition-colors group-hover:bg-white/14 group-hover:text-white/95">
                  <span className="truncate">{textRepresentation}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CommandItem>
  );
}
