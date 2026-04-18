import { useQuery } from "@tanstack/react-query";
import { getFileSearchQueryOptions } from "../api/query";

export function useFileSearch(query: string, page = 1, perPage = 50) {
  return useQuery({
    ...getFileSearchQueryOptions(query, page, perPage),
    placeholderData: (previousData) => previousData,
  });
}
