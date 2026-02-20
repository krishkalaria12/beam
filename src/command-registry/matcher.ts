import type { CommandDescriptor } from "@/command-registry/types";
import type { CommandRankingConfig } from "@/command-registry/ranking-config";
import { DEFAULT_COMMAND_RANKING_CONFIG } from "@/command-registry/ranking-config";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";

const CALCULATOR_CONTEXT_FALLBACK_COMMAND_IDS = new Set([
  "file_search.panel.open",
  "dictionary.panel.open",
  "search.web.google",
  "search.web.duckduckgo",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

type MatchTier = "none" | "contains" | "prefix" | "exact";

interface MatchTierResult {
  tier: MatchTier;
  score: number;
}

function getBestMatchTier(
  terms: readonly string[],
  query: string,
  scores: {
    exact: number;
    prefix: number;
    contains: number;
  },
): MatchTierResult {
  if (query.length === 0 || terms.length === 0) {
    return { tier: "none", score: 0 };
  }

  let tier: MatchTier = "none";

  for (const rawTerm of terms) {
    const term = normalize(rawTerm);
    if (!term) {
      continue;
    }

    if (term === query) {
      tier = "exact";
      break;
    }

    if ((tier === "none" || tier === "contains") && term.startsWith(query)) {
      tier = "prefix";
      continue;
    }

    if (tier === "none" && term.includes(query)) {
      tier = "contains";
    }
  }

  if (tier === "exact") {
    return { tier, score: scores.exact };
  }
  if (tier === "prefix") {
    return { tier, score: scores.prefix };
  }
  if (tier === "contains") {
    return { tier, score: scores.contains };
  }

  return { tier, score: 0 };
}

export interface CommandMatchInput {
  command: CommandDescriptor;
  query: string;
  aliases?: readonly string[];
  config?: CommandRankingConfig;
}

export interface CommandMatchResult {
  matched: boolean;
  score: number;
  matchedTokenCount: number;
  totalTokenCount: number;
  titleMatch: MatchTier;
  keywordMatch: MatchTier;
  aliasMatch: MatchTier;
}

export function matchCommand(input: CommandMatchInput): CommandMatchResult {
  const config = input.config ?? DEFAULT_COMMAND_RANKING_CONFIG;
  const query = normalize(input.query);
  const title = normalize(input.command.title);
  const keywords = input.command.keywords.map((keyword) => normalize(keyword));
  const aliases = (input.aliases ?? []).map((alias) => normalize(alias));
  const tokens = tokenize(query);

  if (query.length === 0) {
    return {
      matched: true,
      score: 0,
      matchedTokenCount: 0,
      totalTokenCount: 0,
      titleMatch: "none",
      keywordMatch: "none",
      aliasMatch: "none",
    };
  }

  const titleMatch = getBestMatchTier([title], query, {
    exact: config.match.titleExact,
    prefix: config.match.titlePrefix,
    contains: config.match.titleContains,
  });
  const keywordMatch = getBestMatchTier(keywords, query, {
    exact: config.match.keywordExact,
    prefix: config.match.keywordPrefix,
    contains: config.match.keywordContains,
  });
  const aliasMatch = getBestMatchTier(aliases, query, {
    exact: config.match.aliasExact,
    prefix: config.match.aliasPrefix,
    contains: config.match.aliasContains,
  });

  const corpus = [title, ...keywords, ...aliases].join(" ");
  const matchedTokenCount = tokens.filter((token) => corpus.includes(token)).length;
  const allTokensMatched = tokens.length > 0 && matchedTokenCount === tokens.length;

  const matched =
    titleMatch.tier !== "none" ||
    keywordMatch.tier !== "none" ||
    aliasMatch.tier !== "none" ||
    allTokensMatched;

  const shouldForceCalculatorFallbackMatch =
    !matched &&
    query.length > 0 &&
    Boolean(input.command.requiresQuery) &&
    CALCULATOR_CONTEXT_FALLBACK_COMMAND_IDS.has(input.command.id) &&
    looksLikeCalculationQuery(query);

  if (!matched && !shouldForceCalculatorFallbackMatch) {
    return {
      matched: false,
      score: 0,
      matchedTokenCount,
      totalTokenCount: tokens.length,
      titleMatch: titleMatch.tier,
      keywordMatch: keywordMatch.tier,
      aliasMatch: aliasMatch.tier,
    };
  }

  let score = 0;
  score += titleMatch.score;
  score += keywordMatch.score;
  score += aliasMatch.score;
  score += matchedTokenCount * config.match.tokenCoveragePerToken;
  if (allTokensMatched) {
    score += config.match.allTokensMatchedBonus;
  }
  if (shouldForceCalculatorFallbackMatch) {
    score += config.match.tokenCoveragePerToken;
  }

  return {
    matched: true,
    score,
    matchedTokenCount,
    totalTokenCount: tokens.length,
    titleMatch: titleMatch.tier,
    keywordMatch: keywordMatch.tier,
    aliasMatch: aliasMatch.tier,
  };
}
