import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  CALCULATOR_RESULT_COMMAND_ID,
  createDefaultCommandProviders,
} from "@/command-registry/default-providers";
import { hasStrongRegistryMatch, isFallbackMode } from "@/command-registry/fallback-commands";
import { createCommandProviderOrchestrator } from "@/command-registry/providers";
import { rankCommands, type CommandRankingSignals } from "@/command-registry/ranker";
import { staticCommandRegistry } from "@/command-registry/registry";
import { resolveStaticCommandCandidates } from "@/command-registry/static-candidates";
import { logProviderResolution } from "@/command-registry/telemetry";
import type {
  CommandContext,
  CommandDescriptor,
  CommandProviderResolution,
} from "@/command-registry/types";
import { useCalculator } from "@/modules/calculator/hooks/use-calculator";

const MANDATORY_TEXT_FALLBACK_COMMAND_IDS = [
  "search.web.google",
  "search.web.duckduckgo",
  "file_search.panel.open",
  "dictionary.panel.open",
] as const;

function isTextQuery(query: string): boolean {
  return /[a-z]/i.test(query);
}

const EMPTY_RESOLUTION: CommandProviderResolution = {
  commands: [],
  errors: [],
  telemetry: [],
};

interface UseRankedRegistryCommandsInput {
  commandContext: CommandContext;
  hiddenCommandIds: ReadonlySet<string>;
  rankingSignals: CommandRankingSignals;
  fallbackEnabled: boolean;
  fallbackCommandIds: readonly string[];
}

export function useRankedRegistryCommands({
  commandContext,
  hiddenCommandIds,
  rankingSignals,
  fallbackEnabled,
  fallbackCommandIds,
}: UseRankedRegistryCommandsInput) {
  const [providerOrchestrator] = useState(() =>
    createCommandProviderOrchestrator({
      providers: createDefaultCommandProviders(),
    }),
  );

  const dynamicResolutionQuery = useQuery<CommandProviderResolution>({
    queryKey: [
      "ranked-registry",
      commandContext,
      [...hiddenCommandIds],
      rankingSignals,
      fallbackEnabled,
      fallbackCommandIds,
    ],
    queryFn: async () => {
      const result = await providerOrchestrator.resolve(commandContext);
      logProviderResolution(result, {
        mode: commandContext.mode,
        activePanel: commandContext.activePanel,
        query: commandContext.query,
      });
      return result;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 0,
  });

  const resolution = dynamicResolutionQuery.data ?? EMPTY_RESOLUTION;
  const normalizedQuery = commandContext.query.trim();
  const { data: calculatorResponse } = useCalculator(normalizedQuery);

  const derivedValues = useMemo(() => {
    const staticCandidates = resolveStaticCommandCandidates(staticCommandRegistry, commandContext);
    const dynamicCommands = resolution.commands.filter(
      (command) => command.scope.includes("all") || command.scope.includes(commandContext.mode),
    );
    const hasProviderCalculatorCommand = dynamicCommands.some(
      (command) => command.id === CALCULATOR_RESULT_COMMAND_ID,
    );
    const hasCalculatorResult =
      hasProviderCalculatorCommand ||
      (calculatorResponse?.status === "valid" &&
        calculatorResponse.outputs.some((entry) => !entry.is_error && entry.value.trim().length > 0));
    const candidateCommands = [...staticCandidates, ...dynamicCommands];
    const scopedCandidates = commandContext.triggeredCommandId
      ? candidateCommands.filter((command) => command.id === commandContext.triggeredCommandId)
      : candidateCommands;
    const visibleCommands = scopedCandidates.filter((command) => !hiddenCommandIds.has(command.id));
    const ranked = rankCommands({
      commands: visibleCommands,
      context: commandContext,
      signals: rankingSignals,
      forceMatchCalculatorFallbacks: hasCalculatorResult,
    });

    const shouldShowFallback =
      fallbackEnabled &&
      normalizedQuery.length > 0 &&
      commandContext.triggeredCommandId === null &&
      isFallbackMode(commandContext.mode) &&
      !hasStrongRegistryMatch(ranked);

    const availableById = new Map<string, CommandDescriptor>(
      visibleCommands.map((command) => [command.id, command]),
    );
    const rankedCommandIds = new Set(ranked.map((entry) => entry.command.id));
    const fallbackCommandsById = new Map<string, CommandDescriptor>();

    const shouldShowMandatoryTextFallbacks =
      normalizedQuery.length > 0 &&
      commandContext.triggeredCommandId === null &&
      isFallbackMode(commandContext.mode) &&
      isTextQuery(normalizedQuery) &&
      !hasCalculatorResult;

    if (shouldShowMandatoryTextFallbacks) {
      for (const commandId of MANDATORY_TEXT_FALLBACK_COMMAND_IDS) {
        if (rankedCommandIds.has(commandId)) {
          continue;
        }
        const command = availableById.get(commandId);
        if (command) {
          fallbackCommandsById.set(command.id, command);
        }
      }
    }

    if (shouldShowFallback) {
      for (const commandId of fallbackCommandIds) {
        if (rankedCommandIds.has(commandId)) {
          continue;
        }
        const command = availableById.get(commandId);
        if (command) {
          fallbackCommandsById.set(command.id, command);
        }
      }
    }

    return {
      ranked,
      fallback: [...fallbackCommandsById.values()],
    };
  }, [
    calculatorResponse,
    commandContext,
    fallbackCommandIds,
    fallbackEnabled,
    hiddenCommandIds,
    normalizedQuery,
    rankingSignals,
    resolution,
  ]);

  return {
    rankedRegistryCommands: derivedValues.ranked,
    fallbackRegistryCommands: derivedValues.fallback,
  };
}
