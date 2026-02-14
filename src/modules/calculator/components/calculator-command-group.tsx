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
        className="rounded-xl border border-border bg-accent/40 p-0 data-[disabled=true]:opacity-100"
      >
        <div className="w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent/90 via-accent/70 to-background/80">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 md:px-5">
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-mono text-xl text-foreground md:text-3xl">{displayQuery}</p>
              <p className="inline-flex rounded-md bg-black/25 px-2 py-0.5 text-xs capitalize text-foreground/90">
                {getCalculationKind(displayQuery)}
              </p>
            </div>

            <ArrowRight className="size-5 text-foreground/80 md:size-6" />

            <div className="min-w-0 text-right">
              <p
                className={`truncate font-semibold text-xl text-foreground transition-opacity duration-120 md:text-4xl ${
                  isFetching ? "opacity-80" : "opacity-100"
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
