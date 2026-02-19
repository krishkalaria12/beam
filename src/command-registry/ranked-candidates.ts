import {
  resolveCommandCandidates,
  type CommandCandidatesResult,
} from "@/command-registry/candidates";
import { rankCommands, type CommandRankingSignals, type RankedCommand } from "@/command-registry/ranker";
import type { CommandContext } from "@/command-registry/types";
import type { CommandRankingConfig } from "@/command-registry/ranking-config";
import type { StaticCommandRegistry } from "@/command-registry/static-registry";
import type { CommandProviderOrchestrator } from "@/command-registry/providers";

export interface RankedCommandCandidatesResult extends CommandCandidatesResult {
  rankedCommands: RankedCommand[];
}

export async function resolveRankedCommandCandidates(options: {
  context: CommandContext;
  registry: StaticCommandRegistry;
  providers?: CommandProviderOrchestrator;
  signals?: CommandRankingSignals;
  config?: CommandRankingConfig;
}): Promise<RankedCommandCandidatesResult> {
  const candidates = await resolveCommandCandidates({
    context: options.context,
    registry: options.registry,
    providers: options.providers,
  });

  const rankedCommands = rankCommands({
    commands: candidates.commands,
    context: options.context,
    signals: options.signals,
    config: options.config,
  });

  return {
    ...candidates,
    rankedCommands,
  };
}

