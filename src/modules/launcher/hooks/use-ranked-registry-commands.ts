import { useEffect, useMemo, useState } from "react";

import { createDefaultCommandProviders } from "@/command-registry/default-providers";
import { createCommandProviderOrchestrator } from "@/command-registry/providers";
import { rankCommands, type CommandRankingSignals, type RankedCommand } from "@/command-registry/ranker";
import { staticCommandRegistry } from "@/command-registry/registry";
import { resolveStaticCommandCandidates } from "@/command-registry/static-candidates";
import { logProviderResolution } from "@/command-registry/telemetry";
import type { CommandContext, CommandProviderResolution } from "@/command-registry/types";

interface UseRankedRegistryCommandsInput {
  commandContext: CommandContext;
  hiddenCommandIds: ReadonlySet<string>;
  rankingSignals: CommandRankingSignals;
}

export function useRankedRegistryCommands({
  commandContext,
  hiddenCommandIds,
  rankingSignals,
}: UseRankedRegistryCommandsInput) {
  const [rankedRegistryCommands, setRankedRegistryCommands] = useState<RankedCommand[]>([]);

  const providerOrchestrator = useMemo(
    () =>
      createCommandProviderOrchestrator({
        providers: createDefaultCommandProviders(),
      }),
    [],
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
      const visibleCommands = [...staticCandidates, ...dynamicCommands].filter(
        (command) => !hiddenCommandIds.has(command.id),
      );
      const ranked = rankCommands({
        commands: visibleCommands,
        context: commandContext,
        signals: rankingSignals,
      });
      setRankedRegistryCommands(ranked);
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
      });

    return () => {
      cancelled = true;
      providerOrchestrator.cancel();
    };
  }, [commandContext, hiddenCommandIds, providerOrchestrator, rankingSignals]);

  return {
    rankedRegistryCommands,
  };
}
