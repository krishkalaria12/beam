import type { SearchResult } from "@/modules/file-search/types";
import { getManagedItemPreferenceId } from "@/modules/launcher/managed-items";
import { toManagedFileItem } from "@/modules/file-search/hooks/use-file-search-action-items";

interface InlineResultUsageEntry {
  count?: number;
}

interface SortInlineFileResultsOptions {
  favoriteIds: readonly string[];
  usageById: Readonly<Record<string, InlineResultUsageEntry>>;
}

const INLINE_FILE_SCORE_DROP_LIMIT = 250;
const INLINE_FILE_RESULT_LIMIT = 6;

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
): SearchResult[] {
  const { favoriteIds, usageById } = options;

  return [...results].sort((left, right) => {
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

export function selectInlineFileBestBand(results: readonly SearchResult[]): SearchResult[] {
  if (results.length === 0) {
    return [];
  }

  const selected: SearchResult[] = [results[0]];

  for (const result of results.slice(1)) {
    if (selected.length >= INLINE_FILE_RESULT_LIMIT) {
      break;
    }

    const previousSelected = selected[selected.length - 1];
    if (previousSelected.score - result.score > INLINE_FILE_SCORE_DROP_LIMIT) {
      break;
    }

    selected.push(result);
  }

  return selected;
}
