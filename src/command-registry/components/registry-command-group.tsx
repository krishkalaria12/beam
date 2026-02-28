import { CALCULATOR_RESULT_COMMAND_ID } from "@/command-registry/default-providers";
import { resolveRecentCommands } from "@/command-registry/recent-commands";
import { SYSTEM_TRIGGER_MODE } from "@/command-registry/trigger-registry";
import { CommandGroup } from "@/components/ui/command";
import { RegistryCommandRow } from "@/command-registry/components/registry-command-row";
import type { RankedCommand } from "@/command-registry/ranker";
import type { CommandDescriptor, CommandMode } from "@/command-registry/types";
import type { CommandUsageEntry } from "@/command-registry/command-preferences";
import { CalculatorResultItem } from "@/modules/calculator/components/calculator-result-item";
import { useCalculator } from "@/modules/calculator/hooks/use-calculator";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";

type RegistryCommandGroupProps = {
  commands: readonly RankedCommand[];
  fallbackCommands: readonly CommandDescriptor[];
  query: string;
  mode: CommandMode;
  onSelect: (commandId: string) => void;
  orderedPinnedCommandIds: readonly string[];
  usageById: Readonly<Record<string, CommandUsageEntry>>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
};

export default function RegistryCommandGroup({
  commands,
  fallbackCommands,
  query,
  mode,
  onSelect,
  orderedPinnedCommandIds,
  usageById,
  onSetPinned,
}: RegistryCommandGroupProps) {
  const pinnedCommandIdSet = new Set(orderedPinnedCommandIds);
  const shouldShowRecentGroup = query.trim().length === 0;
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
      !(mode === SYSTEM_TRIGGER_MODE && providerCalculatorCommand.id.startsWith("system."))
    : false;

  const followUpCommands = hasCalculatorCard
    ? commands
      .filter(({ command }) => command.id !== CALCULATOR_RESULT_COMMAND_ID)
      .map(({ command }) => command)
    : [];

  const commandById = new Map<string, CommandDescriptor>();
  for (const { command } of commands) {
    commandById.set(command.id, command);
  }

  const pinned: CommandDescriptor[] = [];
  for (const commandId of orderedPinnedCommandIds) {
    const command = commandById.get(commandId);
    if (command) {
      pinned.push(command);
    }
  }

  const pinnedIds = new Set(pinned.map((command) => command.id));
  const recent = shouldShowRecentGroup
    ? resolveRecentCommands({
      commands,
      usageById,
      excludedCommandIds: pinnedIds,
    })
    : [];
  const groupedIds = new Set([
    ...pinnedIds,
    ...recent.map((command) => command.id),
  ]);
  const other = commands
    .filter(({ command }) => !groupedIds.has(command.id))
    .map(({ command }) => command);

  const renderCommandRow = (command: CommandDescriptor) => {
    const isSystemTriggerNoQuerySystemAction =
      mode === SYSTEM_TRIGGER_MODE &&
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
                mode === SYSTEM_TRIGGER_MODE &&
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
    return fallbackCommands.length > 0
      ? (
        <CommandGroup heading="Fallback">
          {fallbackCommands.map((command) => renderCommandRow(command))}
        </CommandGroup>
      )
      : null;
  }

  return (
    <>
      {pinned.length > 0 ? (
        <CommandGroup heading="Pinned">
          {pinned.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
      {recent.length > 0 ? (
        <CommandGroup heading="Recent">
          {recent.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
      {other.length > 0 ? (
        <CommandGroup
          heading={pinned.length > 0 || recent.length > 0 ? "Other" : undefined}
        >
          {other.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
      {fallbackCommands.length > 0 ? (
        <CommandGroup heading="Fallback">
          {fallbackCommands.map((command) => renderCommandRow(command))}
        </CommandGroup>
      ) : null}
    </>
  );
}
