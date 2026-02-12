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

export default function SearchCommandGroup() {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();

  const { runSearch, searchingSite, searchError } = useSearchWithBrowser();

  return (
    <CommandGroup heading="web search">
      {searchProviders.map((provider) => {
        const isSearching = searchingSite === provider.id;
        const errorMessage = searchError?.site === provider.id ? searchError.message : null;
        const isDisabled = isSearching;

        return (
          <CommandItem
            key={provider.id}
            value={query ? `${provider.title} ${query}` : provider.title}
            className="rounded-md px-3 py-2.5"
            disabled={isDisabled}
            onSelect={() => {
              if (isDisabled || query.length === 0) {
                return;
              }

              runSearch(provider.id, query);
            }}
          >
            <img
              src={provider.icon}
              alt={`${provider.id} icon`}
              loading="lazy"
              className="size-4 rounded-sm object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[1.08rem] leading-tight text-zinc-100">{provider.title}</p>
              {errorMessage && <p className="truncate text-sm leading-tight text-amber-400">{errorMessage}</p>}
            </div>
            <CommandShortcut className="normal-case tracking-normal text-zinc-400">
              {isSearching ? "opening" : "web"}
            </CommandShortcut>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
