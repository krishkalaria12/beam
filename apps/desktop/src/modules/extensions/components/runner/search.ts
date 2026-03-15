import type { ListEntry } from "@/modules/extensions/components/runner/types";

function scoreSubsequence(text: string, query: string): number {
  if (query.length === 0) {
    return 0;
  }

  let textIndex = 0;
  let queryIndex = 0;
  let contiguousBonus = 0;
  let lastMatchIndex = -2;

  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      if (textIndex === lastMatchIndex + 1) {
        contiguousBonus += 2;
      } else {
        contiguousBonus += 1;
      }
      lastMatchIndex = textIndex;
      queryIndex += 1;
    }
    textIndex += 1;
  }

  if (queryIndex !== query.length) {
    return 0;
  }

  const coverage = query.length / Math.max(text.length, 1);
  return Math.round(contiguousBonus + coverage * 60);
}

function scoreText(text: string, query: string): number {
  if (query.length === 0) {
    return 0;
  }

  const exactIndex = text.indexOf(query);
  if (exactIndex >= 0) {
    return 200 - Math.min(exactIndex, 120);
  }

  const queryTokens = query.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const tokenHits = queryTokens.filter((token) => text.includes(token)).length;
    if (tokenHits > 0) {
      return 80 + tokenHits * 12;
    }
  }

  return scoreSubsequence(text, query);
}

export function filterEntriesByQuery(entries: ListEntry[], query: string): ListEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return entries;
  }

  return entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreText(entry.keywords, normalizedQuery),
    }))
    .filter((record) => record.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .map((record) => record.entry);
}
