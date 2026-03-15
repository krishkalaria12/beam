export interface CommandMatchWeights {
  titleExact: number;
  titlePrefix: number;
  titleContains: number;
  keywordExact: number;
  keywordPrefix: number;
  keywordContains: number;
  aliasExact: number;
  aliasPrefix: number;
  aliasContains: number;
  tokenCoveragePerToken: number;
  allTokensMatchedBonus: number;
}

export interface CommandScoreWeights {
  priorityMultiplier: number;
  scopeModeBoost: number;
  scopeAllBoost: number;
  favoriteBoost: number;
  usageCountMultiplier: number;
  usageCountCap: number;
}

export interface CommandRankingConfig {
  match: CommandMatchWeights;
  score: CommandScoreWeights;
}

export const DEFAULT_COMMAND_RANKING_CONFIG: CommandRankingConfig = {
  match: {
    titleExact: 140,
    titlePrefix: 105,
    titleContains: 70,
    keywordExact: 100,
    keywordPrefix: 75,
    keywordContains: 45,
    aliasExact: 120,
    aliasPrefix: 90,
    aliasContains: 55,
    tokenCoveragePerToken: 16,
    allTokensMatchedBonus: 24,
  },
  score: {
    priorityMultiplier: 12,
    scopeModeBoost: 20,
    scopeAllBoost: 8,
    favoriteBoost: 40,
    usageCountMultiplier: 4,
    usageCountCap: 20,
  },
};
