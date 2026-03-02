interface MatchCommandKeywordsOptions {
  showOnEmpty?: boolean;
}

export function normalizeCommandQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesCommandKeywords(
  query: string,
  keywords: readonly string[],
  options?: MatchCommandKeywordsOptions,
): boolean {
  const normalizedQuery = normalizeCommandQuery(query);
  if (!normalizedQuery) {
    return options?.showOnEmpty ?? true;
  }

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeCommandQuery(keyword);
    if (!normalizedKeyword) {
      return false;
    }

    return (
      normalizedKeyword.includes(normalizedQuery) || normalizedQuery.includes(normalizedKeyword)
    );
  });
}

export function extractCommandKeywordRemainder(query: string, keywords: readonly string[]): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return "";
  }

  const normalizedQuery = normalizeCommandQuery(trimmedQuery);
  const sortedKeywords = [...keywords]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  for (const keyword of sortedKeywords) {
    const normalizedKeyword = normalizeCommandQuery(keyword);
    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedQuery === normalizedKeyword) {
      return "";
    }

    if (normalizedQuery.startsWith(`${normalizedKeyword} `)) {
      return trimmedQuery.slice(keyword.length).trimStart();
    }
  }

  return trimmedQuery;
}
