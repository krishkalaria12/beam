import type { QueryClient } from "@tanstack/react-query";

import { getTranslationLanguages } from "@/modules/translation/api/get-translation-languages";

export const TRANSLATION_LANGUAGES_QUERY_KEY = ["translation", "languages"] as const;
export const TRANSLATION_LANGUAGES_STALE_TIME_MS = 24 * 60 * 60 * 1000;
export const TRANSLATION_LANGUAGES_GC_TIME_MS = 24 * 60 * 60 * 1000;

export function getTranslationLanguagesQueryOptions() {
  return {
    queryKey: TRANSLATION_LANGUAGES_QUERY_KEY,
    queryFn: getTranslationLanguages,
    staleTime: TRANSLATION_LANGUAGES_STALE_TIME_MS,
    gcTime: TRANSLATION_LANGUAGES_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  };
}

export async function warmTranslationLanguagesData(queryClient: QueryClient): Promise<void> {
  await queryClient.ensureQueryData(getTranslationLanguagesQueryOptions());
}
