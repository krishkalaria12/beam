import { useEffect, useState } from "react";

import { createDefaultCommandProviders } from "@/command-registry/default-providers";
import { hasStrongRegistryMatch, isFallbackMode } from "@/command-registry/fallback-commands";
import { createCommandProviderOrchestrator } from "@/command-registry/providers";
import {
  rankCommands,
  type CommandRankingSignals,
  type RankedCommand,
} from "@/command-registry/ranker";
import { staticCommandRegistry } from "@/command-registry/registry";
import { resolveStaticCommandCandidates } from "@/command-registry/static-candidates";
import { logProviderResolution } from "@/command-registry/telemetry";
import type {
  CommandContext,
  CommandDescriptor,
  CommandProviderResolution,
} from "@/command-registry/types";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";

const MANDATORY_TEXT_FALLBACK_COMMAND_IDS = [
  "search.web.google",
  "search.web.duckduckgo",
  "file_search.panel.open",
  "dictionary.panel.open",
] as const;

function isTextQuery(query: string): boolean {
  return /[a-z]/i.test(query);
}

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
  const [rankedRegistryCommands, setRankedRegistryCommands] = useState<RankedCommand[]>([]);
  const [fallbackRegistryCommands, setFallbackRegistryCommands] = useState<CommandDescriptor[]>([]);

  const [providerOrchestrator] = useState(() =>
    createCommandProviderOrchestrator({
      providers: createDefaultCommandProviders(),
    }),
  );

  useEffect(() => {
    let cancelled = false;
    const staticCandidates = resolveStaticCommandCandidates(staticCommandRegistry, commandContext);

    const applyRankedCommands = (dynamicResolution: CommandProviderResolution) => {
      if (cancelled) {
        return;
      }

      const dynamicCommands = dynamicResolution.commands.filter(
        (command) => command.scope.includes("all") || command.scope.includes(commandContext.mode),
      );
      const candidateCommands = [...staticCandidates, ...dynamicCommands];
      const scopedCandidates = commandContext.triggeredCommandId
        ? candidateCommands.filter((command) => command.id === commandContext.triggeredCommandId)
        : candidateCommands;
      const visibleCommands = scopedCandidates.filter(
        (command) => !hiddenCommandIds.has(command.id),
      );
      const ranked = rankCommands({
        commands: visibleCommands,
        context: commandContext,
        signals: rankingSignals,
      });
      setRankedRegistryCommands(ranked);

      const normalizedQuery = commandContext.query.trim();
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
        !looksLikeCalculationQuery(normalizedQuery);

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

      const fallbackCommands = [...fallbackCommandsById.values()];
      setFallbackRegistryCommands(fallbackCommands);
    };

    applyRankedCommands({
      commands: [],
      errors: [],
      telemetry: [],
    });

    void providerOrchestrator
      .resolveIncremental(commandContext, (partialResolution) => {
        applyRankedCommands(partialResolution);
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        applyRankedCommands(result);
        logProviderResolution(result, {
          mode: commandContext.mode,
          activePanel: commandContext.activePanel,
          query: commandContext.query,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to resolve registry commands:", error);
        setRankedRegistryCommands([]);
        setFallbackRegistryCommands([]);
      });

    return () => {
      cancelled = true;
      providerOrchestrator.cancel();
    };
  }, [
    commandContext,
    fallbackCommandIds,
    fallbackEnabled,
    hiddenCommandIds,
    providerOrchestrator,
    rankingSignals,
  ]);

  return {
    rankedRegistryCommands,
    fallbackRegistryCommands,
  };
}
