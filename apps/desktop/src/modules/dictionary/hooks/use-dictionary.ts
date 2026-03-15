import { useQuery } from "@tanstack/react-query";
import { getDefinition } from "../api/get-definition";

export function useDictionary(word: string, language?: string) {
  return useQuery({
    queryKey: ["dictionary", word, language],
    queryFn: () => getDefinition(word, language),
    enabled: word.trim().length > 0,
    staleTime: 0, // Disable caching for debugging
    gcTime: 0, // Disable garbage collection time for debugging
    retry: false,
    refetchOnWindowFocus: false,
  });
}
