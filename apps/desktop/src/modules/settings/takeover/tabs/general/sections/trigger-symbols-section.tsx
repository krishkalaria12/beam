import type { ElementType } from "react";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Hash,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
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
import {
  SettingsSection,
  SettingsSubLabel,
  SettingsHint,
  SettingsDivider,
} from "../components/settings-field";

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
          "flex h-10 flex-1 min-w-0 items-center justify-between gap-2 rounded-xl px-3.5",
          "bg-[var(--launcher-card-bg)] text-launcher-sm font-medium tracking-[-0.01em]",
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
              "text-launcher-sm font-medium transition-colors cursor-pointer",
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

function BuiltInTriggerSymbolsSection({
  draft,
  symbols,
  onReset,
  onDraftChange,
  onSaveSymbol,
}: {
  draft: TriggerSymbols;
  symbols: TriggerSymbols;
  onReset: () => void;
  onDraftChange: (target: TriggerSymbolTarget, value: string) => void;
  onSaveSymbol: (target: TriggerSymbolTarget) => void;
}) {
  return (
    <SettingsSection
      title="Trigger Symbols"
      description="Map single-character launcher prefixes to command groups."
      icon={Target}
      iconVariant="orange"
      headerAction={
        <Button
          type="button"
          onClick={onReset}
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 text-launcher-2xs font-medium text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      }
    >
      <div className="divide-y divide-[var(--launcher-card-border)]/60">
        {TRIGGER_SYMBOL_ROWS.map((row) => {
          const Icon = row.icon;
          const currentValue = draft[row.key];
          const originalValue = symbols[row.key];
          const hasChanges = currentValue !== originalValue;

          return (
            <div
              key={row.key}
              className="flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--launcher-card-bg)]/30"
            >
              <IconChip variant={row.iconVariant} size="md" className="rounded-xl">
                <Icon className="size-4" />
              </IconChip>

              <div className="min-w-0 flex-1">
                <p className="text-launcher-sm font-medium tracking-[-0.01em] text-foreground">{row.title}</p>
                <p className="text-launcher-xs text-muted-foreground">{row.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={currentValue}
                  onChange={(event) => onDraftChange(row.key, event.target.value)}
                  maxLength={1}
                  placeholder="#"
                  className={cn(
                    "size-10 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-0 text-center text-launcher-xl font-semibold text-foreground placeholder:text-muted-foreground",
                    "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                    "transition-all duration-150",
                  )}
                  aria-label={`${row.title} trigger symbol`}
                />
                <Button
                  type="button"
                  onClick={() => onSaveSymbol(row.key)}
                  disabled={!hasChanges}
                  size="sm"
                  className={cn(
                    "rounded-lg px-3 text-launcher-xs font-medium transition-all duration-150",
                    hasChanges
                      ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                      : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed opacity-50",
                  )}
                >
                  Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}

function CustomTriggerMappingsSection({
  draft,
  symbols,
  newCustomSymbol,
  newCustomCommandId,
  onNewCustomSymbolChange,
  onNewCustomCommandIdChange,
  onUpdateBindingSymbol,
  onUpdateBindingCommand,
  onSaveExistingBinding,
  onRemoveBinding,
  onAddBinding,
}: {
  draft: TriggerSymbols;
  symbols: TriggerSymbols;
  newCustomSymbol: string;
  newCustomCommandId: string;
  onNewCustomSymbolChange: (value: string) => void;
  onNewCustomCommandIdChange: (value: string) => void;
  onUpdateBindingSymbol: (index: number, value: string) => void;
  onUpdateBindingCommand: (index: number, value: string) => void;
  onSaveExistingBinding: (index: number) => void;
  onRemoveBinding: (index: number) => void;
  onAddBinding: () => void;
}) {
  return (
    <SettingsSection
      title="Custom Mappings"
      description="Map a prefix symbol to any launcher item."
      icon={Hash}
      iconVariant="green"
    >
      <div className="divide-y divide-[var(--launcher-card-border)]/60">
        {draft.customBindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
              <Plus className="size-4.5 text-muted-foreground" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">No custom mappings yet</p>
            <p className="mt-0.5 text-launcher-xs text-muted-foreground">Add one below to get started</p>
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
                key={`${binding.symbol}:${binding.commandId}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--launcher-card-bg)]/30"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-launcher-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-[var(--launcher-card-border)]">
                  {index + 1}
                </div>

                <Input
                  type="text"
                  value={binding.symbol}
                  onChange={(event) => onUpdateBindingSymbol(index, event.target.value)}
                  maxLength={1}
                  placeholder="#"
                  className={cn(
                    "size-10 shrink-0 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-0 text-center text-launcher-xl font-semibold text-foreground placeholder:text-muted-foreground",
                    "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                    "transition-all duration-150",
                  )}
                  aria-label={`Custom symbol ${index + 1}`}
                />

                <CommandSelector value={binding.commandId} onChange={(value) => onUpdateBindingCommand(index, value)} />

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => onSaveExistingBinding(index)}
                    disabled={!hasChanges}
                    size="sm"
                    className={cn(
                      "rounded-lg px-3 text-launcher-xs font-medium transition-all duration-150",
                      hasChanges
                        ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                        : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed opacity-50",
                    )}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="ghost"
                    onClick={() => onRemoveBinding(index)}
                    className="size-10 rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove custom mapping"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SettingsDivider />

      <div className="px-5 py-4">
        <p className="mb-3 text-launcher-xs font-medium text-muted-foreground">Add new mapping</p>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            value={newCustomSymbol}
            onChange={(event) => onNewCustomSymbolChange(event.target.value)}
            maxLength={1}
            placeholder="#"
            className={cn(
              "size-10 shrink-0 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-0 text-center text-launcher-xl font-semibold text-foreground placeholder:text-muted-foreground",
              "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
              "transition-all duration-150",
            )}
            aria-label="New custom symbol"
          />

          <CommandSelector
            value={newCustomCommandId}
            onChange={onNewCustomCommandIdChange}
            disabled={!HAS_COMMAND_OPTIONS}
            placeholder="Choose item"
          />

          <Button
            type="button"
            onClick={onAddBinding}
            disabled={!HAS_COMMAND_OPTIONS || !newCustomSymbol}
            size="sm"
            className={cn(
              "gap-1.5 rounded-lg px-3.5 text-launcher-xs font-medium transition-all duration-150",
              HAS_COMMAND_OPTIONS && newCustomSymbol
                ? "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
                : "bg-[var(--launcher-card-bg)] text-muted-foreground cursor-not-allowed opacity-50",
            )}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </div>
    </SettingsSection>
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
    <div className="space-y-4">
      <BuiltInTriggerSymbolsSection
        draft={draft}
        symbols={symbols}
        onReset={handleReset}
        onDraftChange={handleDraftChange}
        onSaveSymbol={saveSymbol}
      />

      <CustomTriggerMappingsSection
        draft={draft}
        symbols={symbols}
        newCustomSymbol={newCustomSymbol}
        newCustomCommandId={newCustomCommandId}
        onNewCustomSymbolChange={(value) => setNewCustomSymbol(toSingleCharacter(value))}
        onNewCustomCommandIdChange={setNewCustomCommandId}
        onUpdateBindingSymbol={(index, value) => {
          const nextValue = toSingleCharacter(value);
          setDraftState((previous) => ({
            ...previous,
            value: {
              ...previous.value,
              customBindings: previous.value.customBindings.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, symbol: nextValue } : entry,
              ),
            },
          }));
        }}
        onUpdateBindingCommand={updateCustomBindingCommand}
        onSaveExistingBinding={saveExistingCustomBinding}
        onRemoveBinding={removeCustomBinding}
        onAddBinding={addCustomBinding}
      />
    </div>
  );
}
