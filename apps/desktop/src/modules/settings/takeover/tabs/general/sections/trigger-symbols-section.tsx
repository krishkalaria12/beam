import type { ElementType } from "react";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Hash,
  Plus,
  RotateCcw,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { staticCommandRegistry } from "@/command-registry/registry";
import { IconChip, type IconChipVariant } from "@/components/module";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  icon: ElementType;
  iconVariant: IconChipVariant;
};

type CommandOption = {
  id: string;
  title: string;
};

const TRIGGER_SYMBOL_ROWS: readonly TriggerSymbolRow[] = [
  {
    key: "quicklink",
    title: "Quicklinks",
    description: "Prefix quicklink commands",
    icon: Zap,
    iconVariant: "orange",
  },
  {
    key: "system",
    title: "System Actions",
    description: "Prefix system commands",
    icon: Sparkles,
    iconVariant: "purple",
  },
  {
    key: "script",
    title: "Script Commands",
    description: "Prefix script commands",
    icon: Hash,
    iconVariant: "green",
  },
  {
    key: "shell",
    title: "Shell Commands",
    description: "Prefix inline shell execution",
    icon: Terminal,
    iconVariant: "cyan",
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

function getCommandTitle(commandId: string): string {
  return COMMAND_OPTIONS.find((c) => c.id === commandId)?.title ?? "Choose item";
}

interface CommandSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function CommandSelector({
  value,
  onChange,
  disabled,
  placeholder = "Choose item",
}: CommandSelectorProps) {
  const selectedTitle = value ? getCommandTitle(value) : placeholder;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex h-11 flex-1 min-w-0 items-center justify-between gap-2 rounded-xl px-3.5",
          "bg-[var(--launcher-card-hover-bg)] text-[13px] font-medium tracking-[-0.01em]",
          "ring-1 ring-[var(--launcher-card-border)] transition-all",
          "hover:bg-[var(--launcher-chip-bg)]",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          value ? "text-foreground" : "text-muted-foreground",
        )}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span className="truncate">{selectedTitle}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[280px] w-[280px] overflow-y-auto rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
      >
        {COMMAND_OPTIONS.map((command) => (
          <DropdownMenuItem
            key={command.id}
            onClick={() => onChange(command.id)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2",
              "text-[12px] font-medium transition-colors cursor-pointer",
              "hover:bg-[var(--launcher-chip-bg)] focus:bg-[var(--launcher-chip-bg)]",
              command.id === value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="truncate">{command.title}</span>
            {command.id === value && <Check className="size-3.5 shrink-0 text-[var(--ring)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GeneralTriggerSymbolsSection() {
  const { symbols, updateSymbol, updateCustomBindings, resetSymbols } = useTriggerSymbols();
  const [draftState, setDraftState] = useState<{ key: string; value: TriggerSymbols }>(() => ({
    key: JSON.stringify(symbols),
    value: symbols,
  }));
  const [newCustomSymbol, setNewCustomSymbol] = useState("");
  const [newCustomCommandId, setNewCustomCommandId] = useState(DEFAULT_CUSTOM_COMMAND_ID);

  const draftKey = JSON.stringify(symbols);
  if (draftState.key !== draftKey) {
    setDraftState({ key: draftKey, value: symbols });
  }

  const draft = draftState.value;

  const handleDraftChange = (target: TriggerSymbolTarget, value: string) => {
    setDraftState((previous) => ({
      ...previous,
      value: {
        ...previous.value,
        [target]: toSingleCharacter(value),
      },
    }));
  };

  const saveSymbol = (target: TriggerSymbolTarget) => {
    const symbol = toSingleCharacter(draft[target]);
    try {
      updateSymbol(target, symbol);
      toast.success("Trigger symbol updated.");
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
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
      const message =
        error instanceof Error && error.message.trim().length > 0
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

    const nextBindings = [...draft.customBindings, { symbol, commandId }];
    saveCustomBindings(nextBindings);
    setNewCustomSymbol("");
  };

  const updateCustomBindingCommand = (index: number, commandId: string) => {
    setDraftState((previous) => ({
      ...previous,
      value: {
        ...previous.value,
        customBindings: previous.value.customBindings.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, commandId } : entry,
        ),
      },
    }));
  };

  return (
    <div className="settings-panel space-y-6 rounded-2xl bg-[var(--launcher-card-hover-bg)] px-4 py-5 ring-1 ring-[var(--launcher-card-border)]">
      {/* Trigger Symbols Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Trigger Symbols
          </span>
          <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
        </div>

        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
          Map launcher prefixes to command groups.
        </p>

        <div className="space-y-2.5">
          {TRIGGER_SYMBOL_ROWS.map((row, index) => {
            const Icon = row.icon;
            const currentValue = draft[row.key];
            const originalValue = symbols[row.key];
            const hasChanges = currentValue !== originalValue;

            return (
              <div
                key={row.key}
                className={cn(
                  "group rounded-xl bg-[var(--launcher-card-bg)] p-4",
                  "transition-all duration-200",
                  "hover:bg-[var(--launcher-card-hover-bg)]",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon */}
                  <IconChip variant={row.iconVariant} size="lg" className="size-11 rounded-xl">
                    <Icon className="size-5" />
                  </IconChip>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground">
                      {row.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground">{row.description}</p>
                  </div>

                  {/* Input and Save */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={currentValue}
                      onChange={(event) => {
                        handleDraftChange(row.key, event.target.value);
                      }}
                      maxLength={1}
                      placeholder="#"
                      className={cn(
                        "size-11 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-0 text-center text-[16px] font-semibold text-foreground placeholder:text-muted-foreground",
                        "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                        "transition-all duration-150",
                      )}
                      aria-label={`${row.title} trigger symbol`}
                    />
                    <Button
                      type="button"
                      onClick={() => saveSymbol(row.key)}
                      disabled={!hasChanges}
                      size="sm"
                      className={cn(
                        "rounded-lg px-3.5 text-[12px] font-medium transition-all duration-150",
                        hasChanges
                          ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                          : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom Symbol Mappings */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Custom Mappings
          </span>
          <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
        </div>

        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
          Choose any launcher item and map a symbol to it.
        </p>

        {/* Existing bindings */}
        <div className="space-y-2">
          {draft.customBindings.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-10",
                "rounded-xl border border-dashed border-[var(--launcher-card-border)]",
                "text-center",
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] mb-3">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] text-muted-foreground">No custom mappings yet</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Add one below to get started
              </p>
            </div>
          ) : (
            draft.customBindings.map((binding, index) => {
              const originalBinding = symbols.customBindings[index];
              const hasChanges =
                !originalBinding ||
                binding.symbol !== originalBinding.symbol ||
                binding.commandId !== originalBinding.commandId;

              return (
                <div
                  key={`${binding.symbol}:${binding.commandId}:${index}`}
                  className={cn(
                    "group rounded-xl bg-[var(--launcher-card-bg)] p-4",
                    "transition-all duration-200",
                    "hover:bg-[var(--launcher-card-hover-bg)]",
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {/* Order number */}
                    <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </div>

                    {/* Symbol input */}
                    <Input
                      type="text"
                      value={binding.symbol}
                      onChange={(event) => {
                        const value = toSingleCharacter(event.target.value);
                        setDraftState((previous) => ({
                          ...previous,
                          value: {
                            ...previous.value,
                            customBindings: previous.value.customBindings.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, symbol: value } : entry,
                            ),
                          },
                        }));
                      }}
                      maxLength={1}
                      placeholder="#"
                      className={cn(
                        "size-11 shrink-0 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-0 text-center text-[16px] font-semibold text-foreground placeholder:text-muted-foreground",
                        "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                        "transition-all duration-150",
                      )}
                      aria-label={`Custom symbol ${index + 1}`}
                    />

                    {/* Command selector */}
                    <CommandSelector
                      value={binding.commandId}
                      onChange={(value) => updateCustomBindingCommand(index, value)}
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        onClick={() => saveExistingCustomBinding(index)}
                        disabled={!hasChanges}
                        size="sm"
                        className={cn(
                          "rounded-lg px-3.5 text-[12px] font-medium transition-all duration-150",
                          hasChanges
                            ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                            : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed",
                        )}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="icon-lg"
                        variant="ghost"
                        onClick={() => removeCustomBinding(index)}
                        className={cn(
                          "size-11 rounded-lg",
                          "text-muted-foreground hover:text-destructive",
                          "bg-[var(--launcher-card-bg)] hover:bg-destructive/10",
                          "transition-all duration-150",
                        )}
                        aria-label="Remove custom mapping"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add new mapping */}
        <div className="rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] p-4">
          <p className="mb-3 text-[12px] font-medium text-muted-foreground">Add new mapping</p>

          <div className="flex items-center gap-3">
            {/* Symbol input */}
            <Input
              type="text"
              value={newCustomSymbol}
              onChange={(event) => {
                setNewCustomSymbol(toSingleCharacter(event.target.value));
              }}
              maxLength={1}
              placeholder="#"
              className={cn(
                "size-11 shrink-0 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-0 text-center text-[16px] font-semibold text-foreground placeholder:text-muted-foreground",
                "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                "transition-all duration-150",
              )}
              aria-label="New custom symbol"
            />

            {/* Command selector */}
            <CommandSelector
              value={newCustomCommandId}
              onChange={setNewCustomCommandId}
              disabled={!HAS_COMMAND_OPTIONS}
              placeholder="Choose item"
            />

            {/* Add button */}
            <Button
              type="button"
              onClick={addCustomBinding}
              disabled={!HAS_COMMAND_OPTIONS || !newCustomSymbol}
              size="sm"
              className={cn(
                "gap-1.5 rounded-lg px-4 text-[12px] font-medium transition-all duration-150",
                HAS_COMMAND_OPTIONS && newCustomSymbol
                  ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                  : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed",
              )}
            >
              <Plus className="size-4" />
              <span>Add</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Reset Button */}
      <section className="pt-2">
        <Button
          type="button"
          onClick={handleReset}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 text-[12px] font-medium text-muted-foreground",
            "hover:bg-[var(--launcher-chip-bg)]",
            "transition-all duration-150",
            "hover:text-foreground",
          )}
        >
          <RotateCcw className="size-4" />
          <span>Reset to Defaults</span>
        </Button>
      </section>
    </div>
  );
}
