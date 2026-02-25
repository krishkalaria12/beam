import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CommandGroup } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import type { TriggerSymbolTarget, TriggerSymbols } from "@/modules/settings/api/trigger-symbols";
import { useTriggerSymbols } from "@/modules/settings/hooks/use-trigger-symbols";

type TriggerSymbolRow = {
  key: TriggerSymbolTarget;
  title: string;
  description: string;
};

const TRIGGER_SYMBOL_ROWS: readonly TriggerSymbolRow[] = [
  {
    key: "quicklink",
    title: "Quicklinks",
    description: "Prefix quicklink commands (example: !maps coffee).",
  },
  {
    key: "system",
    title: "System actions",
    description: "Prefix system commands (example: $shutdown).",
  },
  {
    key: "script",
    title: "Script commands",
    description: "Prefix script commands (example: >deploy).",
  },
];

function toSingleCharacter(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return [...trimmed][0] ?? "";
}

export function TriggerSymbolsSettings() {
  const { symbols, updateSymbol, resetSymbols } = useTriggerSymbols();
  const [draft, setDraft] = useState<TriggerSymbols>(symbols);

  useEffect(() => {
    setDraft(symbols);
  }, [symbols]);

  const handleDraftChange = (target: TriggerSymbolTarget, value: string) => {
    setDraft((previous) => ({
      ...previous,
      [target]: toSingleCharacter(value),
    }));
  };

  const saveSymbol = (target: TriggerSymbolTarget) => {
    const symbol = toSingleCharacter(draft[target]);
    try {
      updateSymbol(target, symbol);
      toast.success("Trigger symbol updated.");
    } catch (error) {
      const message = error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Could not update trigger symbol.";
      toast.error(message);
    }
  };

  const handleReset = () => {
    resetSymbols();
    toast.success("Trigger symbols reset to defaults.");
  };

  return (
    <CommandGroup>
      <div className="space-y-4 px-2 pb-2 pt-4">
        <div className="space-y-1 px-1">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Trigger Symbols
          </p>
          <p className="text-xs text-muted-foreground">
            Map launcher prefixes to command groups.
          </p>
        </div>

        <div className="space-y-3">
          {TRIGGER_SYMBOL_ROWS.map((row) => (
            <div
              key={row.key}
              className="rounded-xl border border-border/50 bg-muted/10 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={draft[row.key]}
                  onChange={(event) => {
                    handleDraftChange(row.key, event.target.value);
                  }}
                  maxLength={1}
                  placeholder="#"
                  className="h-8 w-16 text-center text-sm font-semibold"
                  aria-label={`${row.title} trigger symbol`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    saveSymbol(row.key);
                  }}
                  className="h-8 px-3"
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="h-8"
          >
            Reset Defaults
          </Button>
        </div>
      </div>
    </CommandGroup>
  );
}
