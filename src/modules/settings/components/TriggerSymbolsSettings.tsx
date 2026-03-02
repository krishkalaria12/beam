import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Hash, Plus, RotateCcw, Sparkles, Trash2, Zap } from "lucide-react";

import { staticCommandRegistry } from "@/command-registry/registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
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
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
  },
  {
    key: "system",
    title: "System Actions",
    description: "Prefix system commands",
    icon: Sparkles,
    gradient: "from-violet-500/20 to-fuchsia-500/10",
    iconColor: "text-violet-400",
  },
  {
    key: "script",
    title: "Script Commands",
    description: "Prefix script commands",
    icon: Hash,
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
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
          "bg-white/[0.04] text-[13px] font-medium tracking-[-0.01em]",
          "ring-1 ring-white/[0.06] transition-all",
          "hover:bg-white/[0.06]",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          value ? "text-white/80" : "text-white/40",
        )}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span className="truncate">{selectedTitle}</span>
        <ChevronDown className="size-3.5 shrink-0 text-white/30" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[280px] w-[280px] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#2c2c2c] p-1.5 shadow-xl"
      >
        {COMMAND_OPTIONS.map((command) => (
          <DropdownMenuItem
            key={command.id}
            onClick={() => onChange(command.id)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2",
              "text-[12px] font-medium transition-colors cursor-pointer",
              "hover:bg-white/[0.06] focus:bg-white/[0.06]",
              command.id === value ? "text-white" : "text-white/70",
            )}
          >
            <span className="truncate">{command.title}</span>
            {command.id === value && (
              <Check className="size-3.5 shrink-0 text-[var(--solid-accent,#4ea2ff)]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
    setDraft((previous) => ({
      ...previous,
      customBindings: previous.customBindings.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, commandId } : entry,
      ),
    }));
  };

  return (
    <div className="settings-panel space-y-6 px-4 py-6">
      {/* Trigger Symbols Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Trigger Symbols
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <p className="px-1 text-[12px] text-white/35 leading-relaxed">
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
                  "group rounded-xl bg-white/[0.03] p-4",
                  "transition-all duration-200",
                  "hover:bg-white/[0.04]",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl",
                      "bg-gradient-to-br",
                      row.gradient,
                    )}
                  >
                    <Icon className={cn("size-5", row.iconColor)} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium tracking-[-0.02em] text-white/90">
                      {row.title}
                    </p>
                    <p className="text-[12px] text-white/40">{row.description}</p>
                  </div>

                  {/* Input and Save */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(event) => {
                        handleDraftChange(row.key, event.target.value);
                      }}
                      maxLength={1}
                      placeholder="#"
                      className={cn(
                        "size-11 rounded-lg text-center",
                        "bg-white/[0.05] text-[16px] font-semibold text-white/90",
                        "ring-1 ring-white/10",
                        "placeholder:text-white/20",
                        "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
                        "transition-all duration-150",
                      )}
                      aria-label={`${row.title} trigger symbol`}
                    />
                    <button
                      type="button"
                      onClick={() => saveSymbol(row.key)}
                      disabled={!hasChanges}
                      className={cn(
                        "flex items-center justify-center rounded-lg px-3.5 py-2.5",
                        "text-[12px] font-medium",
                        "transition-all duration-150",
                        hasChanges
                          ? "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)] hover:bg-[var(--solid-accent,#4ea2ff)]/30"
                          : "bg-white/[0.03] text-white/30 cursor-not-allowed",
                      )}
                    >
                      Save
                    </button>
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Custom Mappings
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <p className="px-1 text-[12px] text-white/35 leading-relaxed">
          Choose any launcher item and map a symbol to it.
        </p>

        {/* Existing bindings */}
        <div className="space-y-2">
          {draft.customBindings.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-10",
                "rounded-xl border border-dashed border-white/10",
                "text-center",
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/[0.04] mb-3">
                <Plus className="size-5 text-white/30" />
              </div>
              <p className="text-[13px] text-white/45">No custom mappings yet</p>
              <p className="text-[11px] text-white/30 mt-0.5">Add one below to get started</p>
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
                    "group rounded-xl bg-white/[0.03] p-4",
                    "transition-all duration-200",
                    "hover:bg-white/[0.04]",
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {/* Order number */}
                    <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] text-[11px] font-semibold text-white/35 tabular-nums">
                      {index + 1}
                    </div>

                    {/* Symbol input */}
                    <input
                      type="text"
                      value={binding.symbol}
                      onChange={(event) => {
                        const value = toSingleCharacter(event.target.value);
                        setDraft((previous) => ({
                          ...previous,
                          customBindings: previous.customBindings.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, symbol: value } : entry,
                          ),
                        }));
                      }}
                      maxLength={1}
                      placeholder="#"
                      className={cn(
                        "size-11 shrink-0 rounded-lg text-center",
                        "bg-white/[0.05] text-[16px] font-semibold text-white/90",
                        "ring-1 ring-white/10",
                        "placeholder:text-white/20",
                        "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
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
                      <button
                        type="button"
                        onClick={() => saveExistingCustomBinding(index)}
                        disabled={!hasChanges}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-3.5 py-2.5",
                          "text-[12px] font-medium",
                          "transition-all duration-150",
                          hasChanges
                            ? "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)] hover:bg-[var(--solid-accent,#4ea2ff)]/30"
                            : "bg-white/[0.03] text-white/30 cursor-not-allowed",
                        )}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomBinding(index)}
                        className={cn(
                          "flex size-11 items-center justify-center rounded-lg",
                          "text-white/40 hover:text-red-400",
                          "bg-white/[0.03] hover:bg-red-500/10",
                          "transition-all duration-150",
                        )}
                        aria-label="Remove custom mapping"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add new mapping */}
        <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06] p-4">
          <p className="text-[12px] font-medium text-white/50 mb-3">Add new mapping</p>

          <div className="flex items-center gap-3">
            {/* Symbol input */}
            <input
              type="text"
              value={newCustomSymbol}
              onChange={(event) => {
                setNewCustomSymbol(toSingleCharacter(event.target.value));
              }}
              maxLength={1}
              placeholder="#"
              className={cn(
                "size-11 shrink-0 rounded-lg text-center",
                "bg-white/[0.05] text-[16px] font-semibold text-white/90",
                "ring-1 ring-white/10",
                "placeholder:text-white/20",
                "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
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
            <button
              type="button"
              onClick={addCustomBinding}
              disabled={!HAS_COMMAND_OPTIONS || !newCustomSymbol}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2.5",
                "text-[12px] font-medium",
                "transition-all duration-150",
                HAS_COMMAND_OPTIONS && newCustomSymbol
                  ? "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)] hover:bg-[var(--solid-accent,#4ea2ff)]/30"
                  : "bg-white/[0.03] text-white/30 cursor-not-allowed",
              )}
            >
              <Plus className="size-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </section>

      {/* Reset Button */}
      <section className="pt-2">
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5",
            "text-[12px] font-medium text-white/50",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "ring-1 ring-white/[0.06]",
            "transition-all duration-150",
            "hover:text-white/70",
          )}
        >
          <RotateCcw className="size-4" />
          <span>Reset to Defaults</span>
        </button>
      </section>
    </div>
  );
}
