import { CommandItem } from "@/components/ui/command";
import { AlertTriangle } from "lucide-react";

type CalculatorHistoryErrorProps = {
  message?: string;
};

export function CalculatorHistoryError({ message = "could not load calculator history" }: CalculatorHistoryErrorProps) {
  return (
    <CommandItem disabled className="px-3 py-3 opacity-80">
      <AlertTriangle className="size-4 text-destructive" />
      <div className="min-w-0">
        <p className="truncate text-[1.04rem] leading-tight text-foreground/80">
          {message}
        </p>
      </div>
    </CommandItem>
  );
}
