import { useQuery } from "@tanstack/react-query";

import { getDictionaryQueryOptions } from "@/modules/dictionary/api/query";

export function useDictionary(word: string, language?: string) {
  return useQuery({
    ...getDictionaryQueryOptions(word, language),
  });
}
