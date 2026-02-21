import type { CommandDescriptor, CommandProvider } from "@/command-registry/types";
import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import type { ExtensionStoreListing } from "@/modules/extensions/types";

const PROVIDER_SCOPE: ReadonlyArray<"normal" | "compressed"> = ["normal", "compressed"];
const QUERY_PREFIX = "ext ";
const CACHE_TTL_MS = 15_000;
const SEARCH_LIMIT = 8;

interface SearchCacheEntry {
  updatedAtMs: number;
  results: ExtensionStoreListing[];
}

const queryCache = new Map<string, SearchCacheEntry>();
const inflightQueryCache = new Map<string, Promise<ExtensionStoreListing[]>>();

function nowMs(): number {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
}

function parseStoreQuery(query: string): string | null {
  const normalized = query.trim();
  if (!normalized) {
    return null;
  }

  if (!normalized.toLowerCase().startsWith(QUERY_PREFIX)) {
    return null;
  }

  const searchTerm = normalized.slice(QUERY_PREFIX.length).trim();
  return searchTerm.length > 0 ? searchTerm : null;
}

async function getStoreResults(query: string): Promise<ExtensionStoreListing[]> {
  const lowerCased = query.toLowerCase();
  const cached = queryCache.get(lowerCased);
  if (cached && nowMs() - cached.updatedAtMs <= CACHE_TTL_MS) {
    return cached.results;
  }

  const inflight = inflightQueryCache.get(lowerCased);
  if (inflight) {
    return inflight;
  }

  const request = searchStoreExtensions(query, SEARCH_LIMIT)
    .then((results) => {
      queryCache.set(lowerCased, {
        updatedAtMs: nowMs(),
        results,
      });
      return results;
    })
    .finally(() => {
      inflightQueryCache.delete(lowerCased);
    });

  inflightQueryCache.set(lowerCased, request);
  return request;
}

function toInstallCommand(entry: ExtensionStoreListing): CommandDescriptor {
  const slug = entry.name.trim();
  const author = entry.author.handle.trim();
  const fullSlug = `${author}/${slug}`;

  return {
    id: `extensions.store.install.${author}.${slug}`.toLowerCase(),
    title: `install ${entry.title.trim()}`,
    subtitle: fullSlug,
    keywords: [
      "extension",
      "install extension",
      "raycast extension",
      entry.title,
      entry.name,
      entry.description,
      author,
      fullSlug,
    ]
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
    endText: "raycast store",
    icon: "extension",
    kind: "provider-item",
    scope: PROVIDER_SCOPE,
    requiresQuery: true,
    priority: 52,
    action: {
      type: "CUSTOM",
      payload: {
        extensionId: "beam.internal",
        extensionCommandId: "extensions.install",
        sandbox: {
          allowOpenUrl: false,
          allowReadQuery: false,
        },
        extensionInstallDownloadUrl: entry.download_url.trim(),
        extensionInstallSlug: slug,
        extensionInstallTitle: entry.title.trim(),
      },
    },
  };
}

export function createExtensionStoreProvider(): CommandProvider {
  return {
    id: "extensions-store-provider",
    scope: PROVIDER_SCOPE,
    async provide({ context, signal }) {
      if (signal.aborted || !context.isDesktopRuntime) {
        return [];
      }

      const searchTerm = parseStoreQuery(context.rawQuery);
      if (!searchTerm) {
        return [];
      }

      const results = await getStoreResults(searchTerm);
      if (signal.aborted) {
        return [];
      }

      return results.map((entry) => toInstallCommand(entry));
    },
  };
}
