const CALCULATOR_QUERY_PATTERN = /[\d()+\-*/%=]|(^|\s)(to|time|at)(\s|$)/i;

export function looksLikeCalculationQuery(query: string): boolean {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }

  return CALCULATOR_QUERY_PATTERN.test(normalized);
}
