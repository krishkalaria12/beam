import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { type SearchSite, searchWithBrowser } from "../api/search-with-browser";

type SearchError = {
  site: SearchSite;
  message: string;
};

function getSearchErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "could not open browser";
  }

  if (error.message.includes("desktop runtime is required")) {
    return "desktop runtime is required";
  }

  if (error.message.includes("search query is missing")) {
    return "search query is missing";
  }

  return "could not open browser";
}

export function useSearchWithBrowser() {
  const [searchingSite, setSearchingSite] = useState<SearchSite | null>(null);
  const [searchError, setSearchError] = useState<SearchError | null>(null);

  const mutation = useMutation({
    mutationFn: searchWithBrowser,
    retry: 0,
    onMutate: ({ site }) => {
      setSearchingSite(site);
      setSearchError(null);
    },
    onError: (error, { site }) => {
      setSearchingSite(null);
      setSearchError({
        site,
        message: getSearchErrorMessage(error),
      });
    },
    onSuccess: () => {
      setSearchingSite(null);
      setSearchError(null);
    },
  });

  const runSearch = useCallback(
    (site: SearchSite, query: string) => {
      if (mutation.isPending && searchingSite === site) {
        return;
      }

      mutation.mutate({ site, query });
    },
    [mutation, searchingSite],
  );

  return {
    runSearch,
    searchingSite,
    searchError,
  };
}
