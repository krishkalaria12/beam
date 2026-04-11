import type { QueryClient } from "@tanstack/react-query";

import { getDefinition } from "@/modules/dictionary/api/get-definition";

const DICTIONARY_QUERY_KEY = ["dictionary"] as const;
const DICTIONARY_STALE_TIME_MS = 1000 * 60 * 60 * 12;
const DICTIONARY_GC_TIME_MS = 1000 * 60 * 60 * 24;

export function getDictionaryQueryOptions(word: string, language?: string) {
  const normalizedWord = word.trim();

  return {
    queryKey: [...DICTIONARY_QUERY_KEY, normalizedWord, language] as const,
    queryFn: () => getDefinition(normalizedWord, language),
    enabled: normalizedWord.length > 0,
    staleTime: DICTIONARY_STALE_TIME_MS,
    gcTime: DICTIONARY_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  };
}

export async function warmDictionaryData(
  queryClient: QueryClient,
  word: string,
  language?: string,
): Promise<void> {
  const { enabled, ...queryOptions } = getDictionaryQueryOptions(word, language);
  if (!enabled) {
    return;
  }

  await queryClient.ensureQueryData(queryOptions);
}
