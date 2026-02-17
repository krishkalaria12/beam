import { useCommandState } from "cmdk";

import duckduckgoIcon from "@/assets/icons/duckduckgo.png";
import googleIcon from "@/assets/icons/google.jpeg";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

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
    icon: googleIcon,
  },
  {
    id: "duckduckgo",
    title: "search with duckduckgo",
    icon: duckduckgoIcon,
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
          <CommandItem
            key={provider.id}
            value={query ? `${provider.title} ${query}` : provider.title}
            disabled={isDisabled}
            onSelect={() => {
              if (isDisabled || !hasQuery) {
                return;
              }

              runSearch(provider.id, query);
            }}
          >
            <img
              src={provider.icon}
              alt={`${provider.id} icon`}
              loading="lazy"
              className="size-6 rounded-sm object-cover"
            />
            <p className="truncate text-foreground capitalize">{provider.title}</p>
            <CommandShortcut>
              {isSearching ? "opening" : "web"}
            </CommandShortcut>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
