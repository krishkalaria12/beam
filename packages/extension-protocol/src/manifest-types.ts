import {
  DiscoveredPlugin,
  ExtensionManifest,
  type CommandManifest,
  type ManifestAuthor,
  type PreferenceDefinition,
} from "./generated/manifest";

export type ExtensionAuthor = string | { name: string };

export interface ExtensionPreferenceOption {
  title: string;
  value: string;
}

export interface ExtensionPreference {
  name: string;
  type: string;
  title?: string | null;
  description?: string | null;
  required?: boolean | null;
  default?: unknown;
  data?: ExtensionPreferenceOption[] | null;
  label?: string | null;
}

export interface ExtensionCommandManifestRecord {
  name: string;
  title?: string;
  description?: string;
  icon?: string;
  mode?: string;
  interval?: string;
  preferences: ExtensionPreference[];
}

export interface ExtensionManifestRecord {
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  author?: ExtensionAuthor;
  owner?: string;
  commands: ExtensionCommandManifestRecord[];
  preferences: ExtensionPreference[];
}

export interface DiscoveredPluginRecord {
  title: string;
  description?: string;
  pluginTitle: string;
  pluginName: string;
  commandName: string;
  pluginPath: string;
  icon?: string;
  preferences: ExtensionPreference[];
  commandPreferences: ExtensionPreference[];
  mode?: string;
  interval?: string;
  author?: ExtensionAuthor;
  owner?: string;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAuthor(author: ManifestAuthor | undefined): ExtensionAuthor | undefined {
  if (!author) {
    return undefined;
  }

  if (typeof author.simple === "string" && author.simple.trim().length > 0) {
    return author.simple.trim();
  }

  const name = normalizeOptionalString(author.detailed?.name);
  if (!name) {
    return undefined;
  }

  return { name };
}

function normalizePreference(preference: PreferenceDefinition): ExtensionPreference | null {
  const name = normalizeOptionalString(preference.name);
  const type = normalizeOptionalString(preference.type);
  if (!name || !type) {
    return null;
  }

  return {
    name,
    type,
    title: normalizeOptionalString(preference.title) ?? null,
    description: normalizeOptionalString(preference.description) ?? null,
    required: preference.required ?? null,
    default: preference.defaultValue,
    data:
      preference.data.length > 0
        ? preference.data
            .map((entry) => {
              const value = normalizeOptionalString(entry.value);
              if (!value) {
                return null;
              }

              return {
                title: normalizeOptionalString(entry.title) ?? value,
                value,
              };
            })
            .filter((entry): entry is ExtensionPreferenceOption => entry !== null)
        : null,
    label: normalizeOptionalString(preference.label) ?? null,
  };
}

function normalizePreferences(preferences: readonly PreferenceDefinition[]): ExtensionPreference[] {
  return preferences
    .map((preference) => normalizePreference(preference))
    .filter((preference): preference is ExtensionPreference => preference !== null);
}

function normalizeCommand(command: CommandManifest): ExtensionCommandManifestRecord | null {
  const name = normalizeOptionalString(command.name);
  if (!name) {
    return null;
  }

  return {
    name,
    title: normalizeOptionalString(command.title),
    description: normalizeOptionalString(command.description),
    icon: normalizeOptionalString(command.icon),
    mode: normalizeOptionalString(command.mode),
    interval: normalizeOptionalString(command.interval),
    preferences: normalizePreferences(command.preferences),
  };
}

export function parseExtensionManifest(raw: unknown): ExtensionManifestRecord | null {
  try {
    const manifest = ExtensionManifest.fromJSON(raw);
    return {
      name: normalizeOptionalString(manifest.name),
      title: normalizeOptionalString(manifest.title),
      description: normalizeOptionalString(manifest.description),
      icon: normalizeOptionalString(manifest.icon),
      author: normalizeAuthor(manifest.author),
      owner: normalizeOptionalString(manifest.owner),
      commands: manifest.commands
        .map((command) => normalizeCommand(command))
        .filter((command): command is ExtensionCommandManifestRecord => command !== null),
      preferences: normalizePreferences(manifest.preferences),
    };
  } catch {
    return null;
  }
}

export function parseDiscoveredPlugin(raw: unknown): DiscoveredPluginRecord | null {
  try {
    const plugin = DiscoveredPlugin.fromJSON(raw);
    const title = normalizeOptionalString(plugin.title);
    const pluginTitle = normalizeOptionalString(plugin.pluginTitle);
    const pluginName = normalizeOptionalString(plugin.pluginName);
    const commandName = normalizeOptionalString(plugin.commandName);
    const pluginPath = normalizeOptionalString(plugin.pluginPath);

    if (!title || !pluginTitle || !pluginName || !commandName || !pluginPath) {
      return null;
    }

    return {
      title,
      description: normalizeOptionalString(plugin.description),
      pluginTitle,
      pluginName,
      commandName,
      pluginPath,
      icon: normalizeOptionalString(plugin.icon),
      preferences: normalizePreferences(plugin.preferences),
      commandPreferences: normalizePreferences(plugin.commandPreferences),
      mode: normalizeOptionalString(plugin.mode),
      interval: normalizeOptionalString(plugin.interval),
      author: normalizeAuthor(plugin.author),
      owner: normalizeOptionalString(plugin.owner),
    };
  } catch {
    return null;
  }
}

export function parseDiscoveredPluginList(raw: unknown): DiscoveredPluginRecord[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  return raw
    .map((entry) => parseDiscoveredPlugin(entry))
    .filter((entry): entry is DiscoveredPluginRecord => entry !== null);
}
