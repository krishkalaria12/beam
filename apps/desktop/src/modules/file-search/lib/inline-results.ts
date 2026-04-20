import type { FileEntry, SearchResult } from "@/modules/file-search/types";
import { getManagedItemPreferenceId } from "@/modules/launcher/managed-items";
import { toManagedFileItem } from "@/modules/file-search/hooks/use-file-search-action-items";

interface InlineResultUsageEntry {
  count?: number;
}

interface SortInlineFileResultsOptions {
  query: string;
  favoriteIds: readonly string[];
  usageById: Readonly<Record<string, InlineResultUsageEntry>>;
}

export interface InlineFileResult extends SearchResult {
  inlineScore: number;
}

const INLINE_FILE_MIN_PUBLIC_SCORE = 5_000;
const INLINE_FILE_SCORE_DROP_LIMIT = 250;
const INLINE_FILE_RESULT_LIMIT = 5;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getFileStem(name: string): string {
  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return name;
  }

  return name.slice(0, extensionIndex);
}

function splitTokens(value: string): string[] {
  return value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function getQueryParts(query: string): string[] {
  return query.split(/\s+/).filter(Boolean);
}

function allPartsMatch(parts: readonly string[], predicate: (part: string) => boolean): boolean {
  return parts.length > 0 && parts.every(predicate);
}

function tokenExactMatch(haystack: string, parts: readonly string[]): boolean {
  const tokens = splitTokens(haystack);
  return allPartsMatch(parts, (part) => tokens.some((token) => token === part));
}

function tokenPrefixMatch(haystack: string, parts: readonly string[]): boolean {
  const tokens = splitTokens(haystack);
  return allPartsMatch(parts, (part) => tokens.some((token) => token.startsWith(part)));
}

function splitPathSegments(path: string): string[] {
  return path.split(/[\\/]+/).filter(Boolean);
}

function segmentExactMatch(haystack: string, parts: readonly string[]): boolean {
  const segments = splitPathSegments(haystack);
  return allPartsMatch(parts, (part) => segments.some((segment) => segment === part));
}

function segmentPrefixMatch(haystack: string, parts: readonly string[]): boolean {
  const segments = splitPathSegments(haystack);
  return allPartsMatch(parts, (part) => segments.some((segment) => segment.startsWith(part)));
}

function segmentSubstringPosition(haystack: string, query: string): number | null {
  let bestPosition: number | null = null;

  for (const segment of splitPathSegments(haystack)) {
    const position = segment.indexOf(query);
    if (position === -1) {
      continue;
    }

    if (bestPosition === null || position < bestPosition) {
      bestPosition = position;
    }
  }

  return bestPosition;
}

function closenessBonus(haystackLength: number, needleLength: number): number {
  return Math.max(0, 350 - Math.max(0, haystackLength - needleLength));
}

function positionBonus(position: number): number {
  return Math.max(0, 350 - position * 10);
}

function buildPublicScore(tier: number, score: number): number {
  return tier * 1000 + Math.min(score, 999);
}

function getInlineMatchScore(entry: FileEntry, rawQuery: string): number {
  const query = normalize(rawQuery);
  if (query.length === 0) {
    return 0;
  }

  const normalizedName = normalize(entry.name);
  const normalizedStem = normalize(getFileStem(entry.name));
  const normalizedPath = normalize(entry.path);
  const queryParts = getQueryParts(query);
  const queryLength = [...query].length;

  if (normalizedName === query) {
    return buildPublicScore(12, 999);
  }

  if (normalizedStem === query) {
    return buildPublicScore(11, 999);
  }

  if (tokenExactMatch(normalizedName, queryParts) || tokenExactMatch(normalizedStem, queryParts)) {
    return buildPublicScore(10, closenessBonus([...normalizedStem].length, queryLength));
  }

  if (normalizedName.startsWith(query)) {
    return buildPublicScore(9, closenessBonus([...normalizedName].length, queryLength));
  }

  if (normalizedStem.startsWith(query)) {
    return buildPublicScore(8, closenessBonus([...normalizedStem].length, queryLength));
  }

  if (
    tokenPrefixMatch(normalizedName, queryParts) ||
    tokenPrefixMatch(normalizedStem, queryParts)
  ) {
    return buildPublicScore(7, closenessBonus([...normalizedStem].length, queryLength));
  }

  const namePosition = normalizedName.indexOf(query);
  if (namePosition >= 0) {
    return buildPublicScore(
      6,
      positionBonus(namePosition) + closenessBonus([...normalizedName].length, queryLength),
    );
  }

  const stemPosition = normalizedStem.indexOf(query);
  if (stemPosition >= 0) {
    return buildPublicScore(
      5,
      positionBonus(stemPosition) + closenessBonus([...normalizedStem].length, queryLength),
    );
  }

  if (segmentExactMatch(normalizedPath, queryParts)) {
    return buildPublicScore(4, 800);
  }

  if (segmentPrefixMatch(normalizedPath, queryParts)) {
    return buildPublicScore(3, 700);
  }

  const pathPosition = segmentSubstringPosition(normalizedPath, query);
  if (pathPosition !== null) {
    return buildPublicScore(2, positionBonus(pathPosition));
  }

  return 0;
}

function getInlineScoreTier(score: number): number {
  return Math.floor(score / 1000);
}

function getUsageCount(
  usageById: Readonly<Record<string, InlineResultUsageEntry>>,
  result: SearchResult,
): number {
  const managedId = getManagedItemPreferenceId(toManagedFileItem(result.entry));
  const usageCount = usageById[managedId]?.count;
  return typeof usageCount === "number" && Number.isFinite(usageCount) ? usageCount : 0;
}

function isFavorite(favoriteIds: readonly string[], result: SearchResult): boolean {
  const managedId = getManagedItemPreferenceId(toManagedFileItem(result.entry));
  return favoriteIds.includes(managedId);
}

export function sortInlineFileResults(
  results: readonly SearchResult[],
  options: SortInlineFileResultsOptions,
): InlineFileResult[] {
  const { query, favoriteIds, usageById } = options;

  return results
    .map((result) => ({
      ...result,
      inlineScore: getInlineMatchScore(result.entry, query),
    }))
    .filter((result) => result.inlineScore >= INLINE_FILE_MIN_PUBLIC_SCORE)
    .sort((left, right) => {
      if (left.inlineScore !== right.inlineScore) {
        return right.inlineScore - left.inlineScore;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftFavorite = isFavorite(favoriteIds, left);
      const rightFavorite = isFavorite(favoriteIds, right);
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }

      const leftUsage = getUsageCount(usageById, left);
      const rightUsage = getUsageCount(usageById, right);
      if (leftUsage !== rightUsage) {
        return rightUsage - leftUsage;
      }

      return left.entry.path.localeCompare(right.entry.path);
    });
}

export function selectInlineFileBestBand(results: readonly InlineFileResult[]): InlineFileResult[] {
  if (results.length === 0) {
    return [];
  }

  const bestScore = results[0].inlineScore;
  const bestTier = getInlineScoreTier(bestScore);
  const selected: InlineFileResult[] = [results[0]];

  for (const result of results.slice(1)) {
    if (selected.length >= INLINE_FILE_RESULT_LIMIT) {
      break;
    }

    if (getInlineScoreTier(result.inlineScore) !== bestTier) {
      break;
    }

    if (bestScore - result.inlineScore > INLINE_FILE_SCORE_DROP_LIMIT) {
      break;
    }

    selected.push(result);
  }

  return selected;
}
