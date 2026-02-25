import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { staticCommandRegistry } from "@/command-registry/registry";
import { Button } from "@/components/ui/button";
import { CommandGroup } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomTriggerBinding,
  TriggerSymbolTarget,
  TriggerSymbols,
} from "@/modules/settings/api/trigger-symbols";
import { useTriggerSymbols } from "@/modules/settings/hooks/use-trigger-symbols";

type TriggerSymbolRow = {
  key: TriggerSymbolTarget;
  title: string;
  description: string;
};

type CommandOption = {
  id: string;
  title: string;
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

const COMMAND_OPTIONS: readonly CommandOption[] = staticCommandRegistry
  .getAll()
  .filter((command) => !command.hidden && Boolean(command.action))
  .map((command) => ({
    id: command.id,
    title: command.title,
  }))
  .sort((left, right) => left.title.localeCompare(right.title));

const DEFAULT_CUSTOM_COMMAND_ID = COMMAND_OPTIONS[0]?.id ?? "";
const HAS_COMMAND_OPTIONS = COMMAND_OPTIONS.length > 0;

function toSingleCharacter(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return [...trimmed][0] ?? "";
}

export function TriggerSymbolsSettings() {
  const { symbols, updateSymbol, updateCustomBindings, resetSymbols } = useTriggerSymbols();
  const [draft, setDraft] = useState<TriggerSymbols>(symbols);
  const [newCustomSymbol, setNewCustomSymbol] = useState("");
  const [newCustomCommandId, setNewCustomCommandId] = useState(DEFAULT_CUSTOM_COMMAND_ID);

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

  const saveCustomBindings = (nextBindings: CustomTriggerBinding[]) => {
    try {
      updateCustomBindings(nextBindings);
      toast.success("Custom symbol mapping updated.");
    } catch (error) {
      const message = error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Could not update custom symbol mapping.";
      toast.error(message);
    }
  };

  const saveExistingCustomBinding = (index: number) => {
    if (!draft.customBindings[index]) {
      return;
    }

    const nextBindings = draft.customBindings.map((entry) => ({
      symbol: toSingleCharacter(entry.symbol),
      commandId: entry.commandId.trim(),
    }));

    saveCustomBindings(nextBindings);
  };

  const removeCustomBinding = (index: number) => {
    const nextBindings = draft.customBindings.filter((_, entryIndex) => entryIndex !== index);
    saveCustomBindings(nextBindings);
  };

  const addCustomBinding = () => {
    if (!HAS_COMMAND_OPTIONS) {
      toast.error("No command items available to map.");
      return;
    }

    const symbol = toSingleCharacter(newCustomSymbol);
    const commandId = newCustomCommandId.trim() || DEFAULT_CUSTOM_COMMAND_ID;
    if (!symbol || !commandId) {
      toast.error("Pick both symbol and item before adding.");
      return;
    }

    const nextBindings = [
      ...draft.customBindings,
      { symbol, commandId },
    ];
    saveCustomBindings(nextBindings);
    setNewCustomSymbol("");
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

        <div className="space-y-2 px-1">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Custom Symbol Mappings
          </p>
          <p className="text-xs text-muted-foreground">
            Choose any launcher item and map a symbol to it.
          </p>
        </div>

        <div className="space-y-3">
          {draft.customBindings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-3 text-xs text-muted-foreground">
              No custom mappings yet.
            </div>
          ) : (
            draft.customBindings.map((binding, index) => (
              <div
                key={`${binding.symbol}:${binding.commandId}:${index}`}
                className="rounded-xl border border-border/50 bg-muted/10 p-3"
              >
                <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                  <Input
                    value={binding.symbol}
                    onChange={(event) => {
                      const value = toSingleCharacter(event.target.value);
                      setDraft((previous) => ({
                        ...previous,
                        customBindings: previous.customBindings.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, symbol: value } : entry
                        ),
                      }));
                    }}
                    maxLength={1}
                    placeholder="#"
                    className="h-8 text-center text-sm font-semibold"
                    aria-label={`Custom symbol ${index + 1}`}
                  />
                  <Select
                    value={binding.commandId}
                    onValueChange={(nextValue) => {
                      const value = nextValue ?? "";
                      setDraft((previous) => ({
                        ...previous,
                        customBindings: previous.customBindings.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, commandId: value } : entry
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-lg border-border/40 bg-background/20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border/30 bg-background/95 backdrop-blur-xl">
                      {COMMAND_OPTIONS.map((command) => (
                        <SelectItem key={`custom:${command.id}`} value={command.id}>
                          {command.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      saveExistingCustomBinding(index);
                    }}
                    className="h-8 px-3"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeCustomBinding(index);
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    aria-label="Remove custom mapping"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="rounded-xl border border-border/50 bg-background/10 p-3">
            <p className="mb-2 text-xs font-medium text-foreground">Add mapping</p>
            <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
              <Input
                value={newCustomSymbol}
                onChange={(event) => {
                  setNewCustomSymbol(toSingleCharacter(event.target.value));
                }}
                maxLength={1}
                placeholder="#"
                className="h-8 text-center text-sm font-semibold"
                aria-label="New custom symbol"
              />
              <Select
                value={newCustomCommandId}
                disabled={!HAS_COMMAND_OPTIONS}
                onValueChange={(nextValue) => {
                  setNewCustomCommandId(nextValue ?? "");
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-lg border-border/40 bg-background/20 text-xs">
                  <SelectValue placeholder="Choose item" />
                </SelectTrigger>
                <SelectContent className="border-border/30 bg-background/95 backdrop-blur-xl">
                  {COMMAND_OPTIONS.map((command) => (
                    <SelectItem key={`new:${command.id}`} value={command.id}>
                      {command.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addCustomBinding}
              disabled={!HAS_COMMAND_OPTIONS}
              className="mt-2 h-8 gap-1.5 px-3"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
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
