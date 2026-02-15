import { CommandItem } from "@/components/ui/command";
import { Loader2 } from "lucide-react";

export function CalculatorHistoryLoading() {
  return (
    <CommandItem disabled className="px-3 py-3 opacity-80">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-[1.04rem] leading-tight text-foreground/80">
          loading calculator history
        </p>
      </div>
    </CommandItem>
  );
}
