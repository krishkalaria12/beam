import { CommandItem } from "@/components/ui/command";
import { Calculator } from "lucide-react";

export function CalculatorHistoryEmpty() {
  return (
    <CommandItem disabled className="px-3 py-3 opacity-80">
      <Calculator className="size-4 text-muted-foreground opacity-80" />
      <div className="min-w-0">
        <p className="truncate text-[1.04rem] leading-tight text-foreground/80">
          no calculator history found
        </p>
      </div>
    </CommandItem>
  );
}
