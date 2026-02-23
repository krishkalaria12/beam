import { useCommandState } from "cmdk";

import { AsyncCommandRow } from "@/components/command/async-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

import { type SearchSite } from "../api/search-with-browser";
import { useSearchWithBrowser } from "../hooks/use-search-with-browser";

type SearchProvider = {
  id: SearchSite;
  title: string;
  icon: string;
};

const searchProviders: SearchProvider[] = [
  {
    id: "google",
    title: "search with google",
    icon: "google",
  },
  {
    id: "duckduckgo",
    title: "search with duckduckgo",
    icon: "duckduckgo",
  },
];

interface SearchCommandGroupProps {
  queryOverride?: string;
}

export default function SearchCommandGroup({ queryOverride }: SearchCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = (queryOverride ?? searchInput).trim();
  const hasQuery = query.length > 0;

  const { runSearch, searchingSite } = useSearchWithBrowser();

  return (
    <CommandGroup>
      {searchProviders.map((provider) => {
        const isSearching = searchingSite === provider.id;
        const isDisabled = isSearching || !hasQuery;

        return (
          <AsyncCommandRow
            key={provider.id}
            value={query ? `${provider.title} ${query}` : provider.title}
            disabled={!hasQuery}
            isBusy={isSearching}
            onSelect={() => {
              if (isDisabled || !hasQuery) {
                return;
              }

              runSearch(provider.id, query);
            }}
            icon={<CommandIcon icon={provider.icon} />}
            title={provider.title}
            busyShortcut="opening"
            idleShortcut="web"
          />
        );
      })}
    </CommandGroup>
  );
}
