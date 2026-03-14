import {
  toExtensionCommandDescriptors,
  type ExtensionCommandMetadata,
} from "@/command-registry/extension-adapter";
import type { CommandDescriptor } from "@/command-registry/types";
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

function nowMs(): number {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
}

export function invalidateExtensionCatalog(): void {
  cachedPlugins = [];
  cacheUpdatedAt = 0;
  inflightPluginsPromise = null;
}

export async function getExtensionCatalogPlugins(): Promise<PluginInfo[]> {
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

export function getPluginAuthorPrefix(plugin: PluginInfo): string {
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

export function toExtensionRuntimeId(plugin: PluginInfo): string {
  return `${getPluginAuthorPrefix(plugin)}.${plugin.pluginName}`;
}

export function isExecutableExtensionPlugin(plugin: PluginInfo): boolean {
  const normalizedMode = plugin.mode?.trim().toLowerCase();
  return normalizedMode === "no-view" || normalizedMode === "view" || normalizedMode === "menu-bar";
}

export function isPersistentExtensionPlugin(plugin: PluginInfo): boolean {
  return (
    plugin.mode === "menu-bar" ||
    (plugin.mode === "no-view" && typeof plugin.interval === "string" && plugin.interval.length > 0)
  );
}

export function matchExtensionPlugin(plugin: PluginInfo, query: string): boolean {
  if (!query) {
    return false;
  }

  const searchableParts = [
    plugin.title,
    plugin.description ?? "",
    plugin.pluginTitle,
    plugin.pluginName,
    plugin.commandName,
    getPluginAuthorPrefix(plugin),
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
    extensionId: toExtensionRuntimeId(plugin),
    commandId: plugin.commandName,
    title,
    subtitle: subtitleParts.join(" - ") || undefined,
    keywords: [
      plugin.title,
      plugin.pluginTitle,
      plugin.pluginName,
      plugin.commandName,
      plugin.description ?? "",
      getPluginAuthorPrefix(plugin),
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

export function toExtensionCommandDescriptorForPlugin(plugin: PluginInfo): CommandDescriptor {
  return toExtensionCommandDescriptors([toCommandMetadata(plugin)])[0]!;
}

export async function searchExtensionCatalog(query: string): Promise<CommandDescriptor[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const plugins = await getExtensionCatalogPlugins();
  return plugins
    .filter((plugin) => isExecutableExtensionPlugin(plugin))
    .filter((plugin) => matchExtensionPlugin(plugin, normalizedQuery))
    .map((plugin) => toExtensionCommandDescriptorForPlugin(plugin));
}

export async function findExtensionCommandByQualifiedName(input: {
  ownerOrAuthor: string;
  extensionName: string;
  commandName: string;
}): Promise<PluginInfo | null> {
  const requestedOwner = input.ownerOrAuthor.trim().toLowerCase();
  const requestedExtension = input.extensionName.trim().toLowerCase();
  const requestedCommand = input.commandName.trim().toLowerCase();
  if (!requestedOwner || !requestedExtension || !requestedCommand) {
    return null;
  }

  const plugins = await getExtensionCatalogPlugins();
  return (
    plugins.find((plugin) => {
      const owner = plugin.owner?.trim().toLowerCase() ?? "";
      const author =
        typeof plugin.author === "string"
          ? plugin.author.trim().toLowerCase()
          : (plugin.author?.name?.trim().toLowerCase() ?? "");
      const ownerMatches = owner.length > 0 && owner === requestedOwner;
      const authorMatches = author.length > 0 && author === requestedOwner;
      if (!ownerMatches && !authorMatches) {
        return false;
      }

      return (
        plugin.pluginName.trim().toLowerCase() === requestedExtension &&
        plugin.commandName.trim().toLowerCase() === requestedCommand
      );
    }) ?? null
  );
}

export async function findExtensionCommandByName(input: {
  commandName: string;
  extensionName?: string;
}): Promise<PluginInfo | null> {
  const requestedCommand = input.commandName.trim();
  const requestedPluginName = (input.extensionName ?? "").trim();
  if (!requestedCommand) {
    return null;
  }

  const plugins = await getExtensionCatalogPlugins();
  return (
    plugins.find(
      (entry) =>
        entry.commandName === requestedCommand &&
        requestedPluginName.length > 0 &&
        entry.pluginName === requestedPluginName,
    ) ??
    plugins.find((entry) => entry.commandName === requestedCommand) ??
    null
  );
}
