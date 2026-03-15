import { useQuery } from "@tanstack/react-query";

import { getTranslationLanguages } from "../api/get-translation-languages";

export function useTranslationLanguages() {
  return useQuery({
    queryKey: ["translation", "languages"],
    queryFn: getTranslationLanguages,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
