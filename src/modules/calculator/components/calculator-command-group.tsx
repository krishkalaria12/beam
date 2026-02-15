import { useCommandState } from "cmdk";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { CommandGroup, CommandItem } from "@/components/ui/command";

import { looksLikeCalculationQuery, useCalculator } from "../hooks/use-calculator";

function getCalculationKind(query: string) {
  const normalized = query.toLowerCase();

  if (normalized.includes(" to ")) {
    return "conversion";
  }
  if (normalized.includes("time")) {
    return "time";
  }
  if (normalized.includes("*")) {
    return "product";
  }
  if (normalized.includes("/")) {
    return "quotient";
  }
  if (normalized.includes("+") || normalized.includes("plus")) {
    return "sum";
  }
  if (normalized.includes("-") || normalized.includes("minus")) {
    return "difference";
  }
  if (normalized.includes("%")) {
    return "percentage";
  }

  return "result";
}

export default function CalculatorCommandGroup() {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();
  const normalizedQuery = query.replace(/\s+/g, " ").trim();
  const shouldTryCalculator = looksLikeCalculationQuery(normalizedQuery);

  const { data, isError, isFetching } = useCalculator(query);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const hasValidResponse = data?.status === "valid";
  const primaryOutput = hasValidResponse ? data.outputs.find((output) => !output.is_error) ?? null : null;

  useEffect(() => {
    if (primaryOutput?.value) {
      setLastOutput(primaryOutput.value);
    }
  }, [primaryOutput?.value]);

  if (!query || !shouldTryCalculator) {
    return null;
  }

  if (isError) {
    return null;
  }

  if (!isFetching && data?.status && data.status !== "valid") {
    return null;
  }

  const displayValue = primaryOutput?.value ?? (isFetching ? lastOutput : null);
  if (!displayValue) {
    return null;
  }

  const displayQuery = hasValidResponse && data?.query ? data.query : normalizedQuery;

  return (
    <CommandGroup heading="calculator">
      <CommandItem
        value={`calculator ${displayQuery}`}
        disabled
        className="rounded-lg border border-border/40 bg-muted/20 p-0 data-[disabled=true]:opacity-100 shadow-sm overflow-hidden"
      >
        <div className="w-full">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-mono text-xl font-bold tracking-tight text-foreground/80">{displayQuery}</p>
              <p className="inline-flex rounded bg-foreground/5 border border-foreground/5 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {getCalculationKind(displayQuery)}
              </p>
            </div>

            <ArrowRight className="size-6 text-muted-foreground/30" />

            <div className="min-w-0 text-right">
              <p
                className={`truncate font-mono font-bold text-2xl tracking-tighter text-foreground transition-all duration-300 ${
                  isFetching ? "opacity-40" : "opacity-100"
                }`}
              >
                {displayValue}
              </p>
            </div>
          </div>
        </div>
      </CommandItem>
    </CommandGroup>
  );
}
