import { useQuery } from "@tanstack/react-query";

import { getTranslationLanguagesQueryOptions } from "@/modules/translation/api/query";

export function useTranslationLanguages() {
  return useQuery({
    ...getTranslationLanguagesQueryOptions(),
  });
}
