import { useMemo } from "react";

import { CALCULATOR_RESULT_COMMAND_ID } from "@/command-registry/default-providers";
import { CommandGroup } from "@/components/ui/command";
import { RegistryCommandRow } from "@/command-registry/components/registry-command-row";
import type { RankedCommand } from "@/command-registry/ranker";
import type { CommandDescriptor, CommandMode } from "@/command-registry/types";
import { CalculatorResultItem } from "@/modules/calculator/components/calculator-result-item";
import { useCalculator } from "@/modules/calculator/hooks/use-calculator";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";

type RegistryCommandGroupProps = {
  commands: readonly RankedCommand[];
  query: string;
  mode: CommandMode;
  onSelect: (commandId: string) => void;
  orderedPinnedCommandIds: readonly string[];
  onSetPinned: (commandId: string, pinned: boolean) => void;
};

export default function RegistryCommandGroup({
  commands,
  query,
  mode,
  onSelect,
  orderedPinnedCommandIds,
  onSetPinned,
}: RegistryCommandGroupProps) {
  const pinnedCommandIdSet = useMemo(
    () => new Set(orderedPinnedCommandIds),
    [orderedPinnedCommandIds],
  );
  const providerCalculatorCommand = commands.find(
    ({ command }) => command.id === CALCULATOR_RESULT_COMMAND_ID,
  )?.command;
  const { data: fallbackCalculatorResponse } = useCalculator(query);
  const normalizedQuery = query.trim();
  const isPlainNumberQuery = /^[-+]?\d+(\.\d+)?$/.test(normalizedQuery);
  const numericOnlyQuery = isPlainNumberQuery ? Number(normalizedQuery) : null;
  const numericFallbackResult =
    numericOnlyQuery !== null && Number.isFinite(numericOnlyQuery)
      ? numericOnlyQuery.toLocaleString("en-US")
      : "";

  const fallbackCalculatorResult = !providerCalculatorCommand &&
      fallbackCalculatorResponse?.status === "valid"
    ? fallbackCalculatorResponse.outputs
      .filter((entry) => !entry.is_error)
      .map((entry) => entry.value.trim())
      .filter((value) => value.length > 0)
    : [];

  const fallbackPrimaryResult = fallbackCalculatorResult[0] ?? numericFallbackResult;
  const hasFallbackCalculator =
    !providerCalculatorCommand &&
    looksLikeCalculationQuery(query) &&
    fallbackPrimaryResult.length > 0;

  const hasCalculatorCard =
    !isPlainNumberQuery &&
    (Boolean(providerCalculatorCommand) || hasFallbackCalculator);
  const calculatorQuery = providerCalculatorCommand?.subtitle?.trim() ??
    fallbackCalculatorResponse?.query?.trim() ??
    query.trim();
  const calculatorResult = providerCalculatorCommand?.title.trim() ?? fallbackPrimaryResult;
  const calculatorCommandValue = providerCalculatorCommand
    ? `${providerCalculatorCommand.id} ${providerCalculatorCommand.title} ${providerCalculatorCommand.keywords.join(" ")}`
    : `${CALCULATOR_RESULT_COMMAND_ID} ${calculatorResult} ${calculatorQuery}`;
  const calculatorShortcut = providerCalculatorCommand?.endText ?? "copy";
  const isCalculatorDisabled = providerCalculatorCommand
    ? Boolean(providerCalculatorCommand.requiresQuery) &&
      query.length === 0 &&
      !(mode === "system-trigger" && providerCalculatorCommand.id.startsWith("system."))
    : false;

  const followUpCommands = hasCalculatorCard
    ? commands
      .filter(({ command }) => command.id !== CALCULATOR_RESULT_COMMAND_ID)
      .map(({ command }) => command)
    : [];

  const groupedCommands = useMemo(() => {
    const commandById = new Map<string, RankedCommand>();
    for (const entry of commands) {
      commandById.set(entry.command.id, entry);
    }

    const pinned = orderedPinnedCommandIds
      .map((commandId) => commandById.get(commandId))
      .filter((entry): entry is RankedCommand => Boolean(entry))
      .map(({ command }) => command);

    const pinnedIds = new Set(pinned.map((command) => command.id));
    const other = commands
      .filter(({ command }) => !pinnedIds.has(command.id))
      .map(({ command }) => command);

    return {
      pinned,
      other,
    };
  }, [commands, orderedPinnedCommandIds]);

  const renderCommandRow = (command: CommandDescriptor) => {
    const isSystemTriggerNoQuerySystemAction =
      mode === "system-trigger" &&
      query.length === 0 &&
      command.id.startsWith("system.");
    const isDisabled =
      Boolean(command.requiresQuery) &&
      query.length === 0 &&
      !isSystemTriggerNoQuerySystemAction;

    return (
      <RegistryCommandRow
        key={command.id}
        command={command}
        isDisabled={isDisabled}
        onSelect={onSelect}
        isPinned={pinnedCommandIdSet.has(command.id)}
        onSetPinned={onSetPinned}
      />
    );
  };

  if (hasCalculatorCard) {
    const activateCalculator = providerCalculatorCommand
      ? () => {
        onSelect(providerCalculatorCommand.id);
      }
      : () => {
        void navigator.clipboard.writeText(calculatorResult);
      };

    return (
      <>
        <CommandGroup heading="Calculator">
          <CalculatorResultItem
            commandValue={calculatorCommandValue}
            calculatorQuery={calculatorQuery}
            calculatorResult={calculatorResult}
            shortcutText={calculatorShortcut}
            isDisabled={isCalculatorDisabled}
            onActivate={activateCalculator}
          />
        </CommandGroup>

        {followUpCommands.length > 0 ? (
          <CommandGroup heading={`Use "${calculatorQuery}" with...`}>
            {followUpCommands.map((command) => {
              const isSystemTriggerNoQuerySystemAction =
                mode === "system-trigger" &&
                query.length === 0 &&
                command.id.startsWith("system.");
              const isDisabled =
                Boolean(command.requiresQuery) &&
                query.length === 0 &&
                !isSystemTriggerNoQuerySystemAction;

              return (
                <RegistryCommandRow
                  key={command.id}
                  command={command}
                  isDisabled={isDisabled}
                  onSelect={onSelect}
                  isPinned={pinnedCommandIdSet.has(command.id)}
                  onSetPinned={onSetPinned}
                  compact
                />
              );
            })}
          </CommandGroup>
        ) : null}
      </>
    );
  }

  if (commands.length === 0) {
    return null;
  }

  return (
    <>
      {groupedCommands.pinned.length > 0 ? (
        <CommandGroup heading="Pinned">
          {groupedCommands.pinned.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
      {groupedCommands.other.length > 0 ? (
        <CommandGroup heading={groupedCommands.pinned.length > 0 ? "Other" : undefined}>
          {groupedCommands.other.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
    </>
  );
}
