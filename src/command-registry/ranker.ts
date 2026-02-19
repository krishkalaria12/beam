import type {
  CommandContext,
  CommandDescriptor,
} from "@/command-registry/types";
import type { CommandRankingConfig } from "@/command-registry/ranking-config";
import { DEFAULT_COMMAND_RANKING_CONFIG } from "@/command-registry/ranking-config";
import { matchCommand, type CommandMatchResult } from "@/command-registry/matcher";

export interface CommandRankingSignals {
  favorites?: ReadonlySet<string>;
  usageCountById?: ReadonlyMap<string, number>;
  aliasesById?: ReadonlyMap<string, readonly string[]>;
}

export interface RankedCommand {
  command: CommandDescriptor;
  score: number;
  match: CommandMatchResult;
  isFavorite: boolean;
  usageCount: number;
  aliases: readonly string[];
}

function getSafeUsageCount(
  usageCountById: ReadonlyMap<string, number> | undefined,
  commandId: string,
): number {
  if (!usageCountById) {
    return 0;
  }

  const value = usageCountById.get(commandId);
  if (!Number.isFinite(value) || typeof value !== "number") {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function getAliases(
  aliasesById: ReadonlyMap<string, readonly string[]> | undefined,
  commandId: string,
): readonly string[] {
  return aliasesById?.get(commandId) ?? [];
}

function compareRankedCommands(left: RankedCommand, right: RankedCommand): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.match.matchedTokenCount !== right.match.matchedTokenCount) {
    return right.match.matchedTokenCount - left.match.matchedTokenCount;
  }

  if (left.isFavorite !== right.isFavorite) {
    return left.isFavorite ? -1 : 1;
  }

  const leftTitle = left.command.title.toLowerCase();
  const rightTitle = right.command.title.toLowerCase();
  if (leftTitle !== rightTitle) {
    return leftTitle.localeCompare(rightTitle);
  }

  return left.command.id.localeCompare(right.command.id);
}

export function rankCommands(options: {
  commands: readonly CommandDescriptor[];
  context: CommandContext;
  signals?: CommandRankingSignals;
  config?: CommandRankingConfig;
}): RankedCommand[] {
  const config = options.config ?? DEFAULT_COMMAND_RANKING_CONFIG;
  const signals = options.signals;

  const ranked: RankedCommand[] = [];

  for (const command of options.commands) {
    const aliases = getAliases(signals?.aliasesById, command.id);
    const match = matchCommand({
      command,
      query: options.context.query,
      aliases,
      config,
    });

    if (!match.matched) {
      continue;
    }

    const priority = Number.isFinite(command.priority) ? command.priority ?? 0 : 0;
    const isFavorite = signals?.favorites?.has(command.id) ?? false;
    const usageCount = getSafeUsageCount(signals?.usageCountById, command.id);

    let score = match.score;
    score += priority * config.score.priorityMultiplier;
    score += command.scope.includes(options.context.mode)
      ? command.scope.includes("all")
        ? config.score.scopeAllBoost
        : config.score.scopeModeBoost
      : 0;
    score += isFavorite ? config.score.favoriteBoost : 0;
    score +=
      Math.min(usageCount, config.score.usageCountCap) *
      config.score.usageCountMultiplier;

    ranked.push({
      command,
      score,
      match,
      isFavorite,
      usageCount,
      aliases,
    });
  }

  return ranked.sort(compareRankedCommands);
}

