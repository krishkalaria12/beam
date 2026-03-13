import type { CommandDescriptor, CommandProvider } from "@/command-registry/types";
import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import {
  EXTENSIONS_PROVIDER_CACHE_TTL_MS,
  EXTENSIONS_PROVIDER_SCOPE,
  EXTENSIONS_STORE_PROVIDER_QUERY_PREFIX,
  EXTENSIONS_STORE_PROVIDER_SEARCH_LIMIT,
} from "@/modules/extensions/constants";
import type {
  ExtensionStoreListing,
  ExtensionStoreSearchCacheEntry,
} from "@/modules/extensions/types";

const queryCache = new Map<string, ExtensionStoreSearchCacheEntry>();
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

  if (!normalized.toLowerCase().startsWith(EXTENSIONS_STORE_PROVIDER_QUERY_PREFIX)) {
    return null;
  }

  const searchTerm = normalized.slice(EXTENSIONS_STORE_PROVIDER_QUERY_PREFIX.length).trim();
  return searchTerm.length > 0 ? searchTerm : null;
}

function toReleaseChannelInput(channelName: string | undefined, channel: number): string | undefined {
  if (channelName && channelName.trim().length > 0) {
    return channelName.trim();
  }

  switch (channel) {
    case 1:
      return "stable";
    case 2:
      return "beta";
    case 3:
      return "nightly";
    case 4:
      return "custom";
    default:
      return undefined;
  }
}

async function getStoreResults(query: string): Promise<ExtensionStoreListing[]> {
  const lowerCased = query.toLowerCase();
  const cached = queryCache.get(lowerCased);
  if (cached && nowMs() - cached.updatedAtMs <= EXTENSIONS_PROVIDER_CACHE_TTL_MS) {
    return cached.results;
  }

  const inflight = inflightQueryCache.get(lowerCased);
  if (inflight) {
    return inflight;
  }

  const request = searchStoreExtensions(query, EXTENSIONS_STORE_PROVIDER_SEARCH_LIMIT)
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
  const slug = entry.slug.trim();
  const author = entry.author.handle.trim();
  const fullSlug = `${author}/${slug}`;
  const iconReference =
    entry.icons?.light?.trim() || entry.icons?.dark?.trim() || entry.author.avatar?.trim() || "";

  return {
    id: `extensions.store.install.${author}.${slug}`.toLowerCase(),
    title: `install ${entry.title.trim()}`,
    subtitle: fullSlug,
    keywords: [
      "extension",
      "install extension",
      "beam extension",
      entry.title,
      entry.slug,
      entry.description,
      author,
      fullSlug,
    ]
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
    endText: "beam store",
    icon: iconReference ? `extension-icon:${iconReference}` : "extension",
    kind: "provider-item",
    scope: EXTENSIONS_PROVIDER_SCOPE,
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
        extensionInstallPackageId: entry.id.trim(),
        extensionInstallReleaseVersion: entry.latestRelease.version.trim(),
        extensionInstallChannel: toReleaseChannelInput(
          entry.latestRelease.channelName,
          entry.latestRelease.channel,
        ),
        extensionInstallSlug: slug,
        extensionInstallTitle: entry.title.trim(),
      },
    },
  };
}

export function createExtensionStoreProvider(): CommandProvider {
  return {
    id: "extensions-store-provider",
    scope: EXTENSIONS_PROVIDER_SCOPE,
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
