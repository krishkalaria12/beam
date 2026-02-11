import { useCommandState } from "cmdk";

import duckduckgoIcon from "@/assets/icons/duckduckgo.png";
import googleIcon from "@/assets/icons/google.jpeg";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

import { type SearchSite } from "../api/search-with-browser";
import { useSearchWithBrowser } from "../hooks/use-search-with-browser";

type SearchProvider = {
  id: SearchSite;
  title: string;
  subtitle: string;
  icon: string;
};

const searchProviders: SearchProvider[] = [
  {
    id: "google",
    title: "search with google",
    subtitle: "open google results in browser",
    icon: googleIcon,
  },
  {
    id: "duckduckgo",
    title: "search with duckduckgo",
    subtitle: "open duckduckgo results in browser",
    icon: duckduckgoIcon,
  },
];

export default function SearchCommandGroup() {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();

  const { runSearch, searchingSite, searchError } = useSearchWithBrowser();

  if (!query) {
    return null;
  }

  return (
    <CommandGroup heading="web search">
      {searchProviders.map((provider) => {
        const isSearching = searchingSite === provider.id;
        const errorMessage = searchError?.site === provider.id ? searchError.message : null;

        return (
          <CommandItem
            key={provider.id}
            value={`${provider.title} ${query}`}
            className="rounded-md px-3 py-3"
            disabled={isSearching}
            onSelect={() => runSearch(provider.id, query)}
          >
            <img
              src={provider.icon}
              alt={`${provider.id} icon`}
              loading="lazy"
              className="size-4 rounded-sm object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[1.08rem] leading-tight text-zinc-100">{provider.title}</p>
              <p
                className={`truncate text-base leading-tight ${
                  errorMessage ? "text-amber-400" : "text-zinc-400"
                }`}
              >
                {errorMessage ?? `${provider.subtitle}: ${query}`}
              </p>
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
