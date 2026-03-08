import {
  toExtensionCommandDescriptors,
  type ExtensionCommandMetadata,
} from "@/command-registry/extension-adapter";
import type { CommandProvider } from "@/command-registry/types";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import {
  EXTENSIONS_PROVIDER_CACHE_TTL_MS,
  EXTENSIONS_PROVIDER_SCOPE,
} from "@/modules/extensions/constants";
import { resolveExtensionIconReference } from "@/modules/extensions/lib/icon";
import type { PluginInfo } from "@/modules/extensions/types";

let cachedPlugins: PluginInfo[] = [];
let cacheUpdatedAt = 0;
let inflightPluginsPromise: Promise<PluginInfo[]> | null = null;

export function invalidateDiscoveredExtensionsCache(): void {
  cachedPlugins = [];
  cacheUpdatedAt = 0;
  inflightPluginsPromise = null;
}

function nowMs(): number {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
}

function getAuthorPrefix(plugin: PluginInfo): string {
  if (plugin.owner && plugin.owner.trim().length > 0) {
    return plugin.owner.trim().toLowerCase();
  }

  if (typeof plugin.author === "string") {
    const author = plugin.author.trim().toLowerCase();
    if (author.length > 0) {
      return author;
    }
  }

  if (plugin.author && typeof plugin.author === "object" && "name" in plugin.author) {
    const authorName = plugin.author.name.trim().toLowerCase();
    if (authorName.length > 0) {
      return authorName;
    }
  }

  return "extension";
}

function toExtensionId(plugin: PluginInfo): string {
  const authorPrefix = getAuthorPrefix(plugin);
  return `${authorPrefix}.${plugin.pluginName}`;
}

function isExecutableInBeam(plugin: PluginInfo): boolean {
  const normalizedMode = plugin.mode?.trim().toLowerCase();
  return (
    normalizedMode === "no-view" ||
    normalizedMode === "view" ||
    normalizedMode === "menu-bar"
  );
}

function matchPlugin(plugin: PluginInfo, query: string): boolean {
  if (!query) {
    return false;
  }

  const searchableParts = [
    plugin.title,
    plugin.description ?? "",
    plugin.pluginTitle,
    plugin.pluginName,
    plugin.commandName,
    getAuthorPrefix(plugin),
  ];

  const haystack = searchableParts.join(" ").toLowerCase();
  return haystack.includes(query);
}

function toCommandMetadata(plugin: PluginInfo): ExtensionCommandMetadata {
  const title = plugin.title.trim() || plugin.commandName.trim() || plugin.pluginName.trim();
  const subtitleParts = [plugin.pluginTitle.trim(), plugin.description?.trim() ?? ""].filter(
    (part) => part.length > 0,
  );
  const iconReference = resolveExtensionIconReference(plugin.icon);

  return {
    extensionId: toExtensionId(plugin),
    commandId: plugin.commandName,
    title,
    subtitle: subtitleParts.join(" - ") || undefined,
    keywords: [
      plugin.title,
      plugin.pluginTitle,
      plugin.pluginName,
      plugin.commandName,
      plugin.description ?? "",
      getAuthorPrefix(plugin),
      "raycast",
      "extension",
    ]
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
    endText: "extension",
    icon: iconReference ? `extension-icon:${iconReference}` : "extension",
    scope: EXTENSIONS_PROVIDER_SCOPE,
    requiresQuery: true,
    priority: 38,
    payload: {
      pluginPath: plugin.pluginPath,
      pluginMode: plugin.mode ?? "no-view",
      pluginInterval: plugin.interval ?? undefined,
      pluginName: plugin.pluginName,
      commandName: plugin.commandName,
    },
    execution: {
      requiresDesktopRuntime: true,
      allowedModes: EXTENSIONS_PROVIDER_SCOPE,
    },
    sandbox: {
      allowOpenUrl: true,
      allowReadQuery: true,
    },
  };
}

async function loadPlugins(): Promise<PluginInfo[]> {
  const now = nowMs();
  if (cachedPlugins.length > 0 && now - cacheUpdatedAt < EXTENSIONS_PROVIDER_CACHE_TTL_MS) {
    return cachedPlugins;
  }

  if (inflightPluginsPromise) {
    return inflightPluginsPromise;
  }

  inflightPluginsPromise = getDiscoveredPlugins()
    .then((plugins) => {
      cachedPlugins = plugins;
      cacheUpdatedAt = nowMs();
      return plugins;
    })
    .finally(() => {
      inflightPluginsPromise = null;
    });

  return inflightPluginsPromise;
}

export function createExtensionCommandProvider(): CommandProvider {
  return {
    id: "extensions-provider",
    scope: EXTENSIONS_PROVIDER_SCOPE,
    async provide({ context, signal }) {
      const normalizedQuery = context.query.trim().toLowerCase();
      if (!normalizedQuery || signal.aborted || !context.isDesktopRuntime) {
        return [];
      }

      const plugins = await loadPlugins();
      if (signal.aborted) {
        return [];
      }

      const matchedPlugins = plugins
        .filter((plugin) => isExecutableInBeam(plugin))
        .filter((plugin) => matchPlugin(plugin, normalizedQuery));

      return toExtensionCommandDescriptors(
        matchedPlugins.map((plugin) => toCommandMetadata(plugin)),
      );
    },
  };
}
