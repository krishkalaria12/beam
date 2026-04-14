const MATH_OR_TIME_PATTERN = /[\d()+\-*/%=]|(^|\s)(to|time|at)(\s|$)/i;
const DATE_RELATIVE_PATTERN =
  /\b(today|tomorrow|yesterday|tmr|tmrw|yday|date|unix|timestamp|epoch|weekend)\b/i;
const DATE_WEEKDAY_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const DATE_PHRASE_PATTERN =
  /\b(next|last|this|coming|upcoming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year|weekend)\b/i;
const DATE_DURATION_PATTERN =
  /\b\d+\s+(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|second|seconds)\s+(from now|ago|from today|from tomorrow|from yesterday|later)\b|\bin\s+\d+\s+(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|second|seconds)\b/i;
const DATE_NATURAL_PATTERN =
  /^(what\s+(day|date)\s+is|when\s+is|date\s+for|day\s+of|days?\s+between|from\s+.+\s+(to|and|until)\s+.+|(?:the\s+)?(start|beginning|end)\s+of\s+(?:the\s+)?(week|month|year)|(?:the\s+)?(week|month|year)\s+(after\s+next|before\s+last))\b/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/i;

export function looksLikeCalculationQuery(query: string): boolean {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }

  return (
    MATH_OR_TIME_PATTERN.test(normalized) ||
    DATE_RELATIVE_PATTERN.test(normalized) ||
    DATE_WEEKDAY_PATTERN.test(normalized) ||
    DATE_PHRASE_PATTERN.test(normalized) ||
    DATE_DURATION_PATTERN.test(normalized) ||
    DATE_NATURAL_PATTERN.test(normalized) ||
    ISO_DATE_PATTERN.test(normalized)
  );
}
