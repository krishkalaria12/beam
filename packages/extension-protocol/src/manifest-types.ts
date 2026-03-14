import {
  DiscoveredPlugin,
  ExtensionManifest,
  type ArgumentDefinition,
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

export interface ExtensionArgumentOption {
  title: string;
  value: string;
}

export interface ExtensionArgument {
  name: string;
  type: string;
  placeholder?: string | null;
  required?: boolean | null;
  data?: ExtensionArgumentOption[] | null;
}

export interface ExtensionCommandManifestRecord {
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  mode?: string;
  interval?: string;
  keywords: string[];
  arguments: ExtensionArgument[];
  disabledByDefault?: boolean | null;
  preferences: ExtensionPreference[];
}

export interface ExtensionManifestRecord {
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  author?: ExtensionAuthor;
  owner?: string;
  version?: string;
  access?: string;
  license?: string;
  platforms: string[];
  categories: string[];
  contributors: string[];
  pastContributors: string[];
  keywords: string[];
  commands: ExtensionCommandManifestRecord[];
  preferences: ExtensionPreference[];
}

export interface DiscoveredPluginRecord {
  title: string;
  subtitle?: string;
  description?: string;
  pluginTitle: string;
  pluginName: string;
  commandName: string;
  pluginPath: string;
  icon?: string;
  keywords: string[];
  arguments: ExtensionArgument[];
  disabledByDefault?: boolean | null;
  preferences: ExtensionPreference[];
  commandPreferences: ExtensionPreference[];
  mode?: string;
  interval?: string;
  author?: ExtensionAuthor;
  owner?: string;
  version?: string;
  access?: string;
  license?: string;
  platforms: string[];
  categories: string[];
  contributors: string[];
  pastContributors: string[];
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeOptionalString(value) : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readOptionalString(entry))
    .filter((entry): entry is string => entry !== undefined);
}

function normalizeAuthorInput(author: unknown): Record<string, unknown> | undefined {
  if (typeof author === "string") {
    const value = normalizeOptionalString(author);
    return value ? { simple: value } : undefined;
  }

  if (!isRecord(author)) {
    return undefined;
  }

  const simple = readOptionalString(author.simple);
  if (simple) {
    return { simple };
  }

  const detailedFromProto = isRecord(author.detailed) ? readOptionalString(author.detailed.name) : undefined;
  if (detailedFromProto) {
    return { detailed: { name: detailedFromProto } };
  }

  const detailedFromManifest = readOptionalString(author.name);
  if (detailedFromManifest) {
    return { detailed: { name: detailedFromManifest } };
  }

  return undefined;
}

function normalizePreferenceInput(preference: unknown): Record<string, unknown> | null {
  if (!isRecord(preference)) {
    return null;
  }

  const name = readOptionalString(preference.name);
  const type = readOptionalString(preference.type);
  if (!name || !type) {
    return null;
  }

  const data = Array.isArray(preference.data)
    ? preference.data
        .map((entry) => {
          if (!isRecord(entry)) {
            return null;
          }

          const value = readOptionalString(entry.value);
          if (!value) {
            return null;
          }

          return {
            title: readOptionalString(entry.title) ?? value,
            value,
          };
        })
        .filter((entry): entry is { title: string; value: string } => entry !== null)
    : [];
  const hasDefaultValue = Object.prototype.hasOwnProperty.call(preference, "defaultValue");
  const hasDefault = Object.prototype.hasOwnProperty.call(preference, "default");

  return {
    name,
    type,
    title: readOptionalString(preference.title),
    description: readOptionalString(preference.description),
    required: readOptionalBoolean(preference.required),
    defaultValue: hasDefaultValue
      ? preference.defaultValue
      : hasDefault
        ? preference.default
        : undefined,
    data,
    label: readOptionalString(preference.label),
  };
}

function normalizeArgumentInput(argument: unknown): Record<string, unknown> | null {
  if (!isRecord(argument)) {
    return null;
  }

  const name = readOptionalString(argument.name);
  const type = readOptionalString(argument.type);
  if (!name || !type) {
    return null;
  }

  const data = Array.isArray(argument.data)
    ? argument.data
        .map((entry) => {
          if (!isRecord(entry)) {
            return null;
          }

          const value = readOptionalString(entry.value);
          if (!value) {
            return null;
          }

          return {
            title: readOptionalString(entry.title) ?? value,
            value,
          };
        })
        .filter((entry): entry is { title: string; value: string } => entry !== null)
    : [];

  return {
    name,
    type,
    placeholder: readOptionalString(argument.placeholder),
    required: readOptionalBoolean(argument.required),
    data,
  };
}

function normalizeCommandInput(command: unknown): Record<string, unknown> | null {
  if (!isRecord(command)) {
    return null;
  }

  const name = readOptionalString(command.name);
  if (!name) {
    return null;
  }

  return {
    name,
    title: readOptionalString(command.title),
    subtitle: readOptionalString(command.subtitle),
    description: readOptionalString(command.description),
    icon: readOptionalString(command.icon),
    mode: readOptionalString(command.mode),
    interval: readOptionalString(command.interval),
    keywords: readStringList(command.keywords),
    arguments: Array.isArray(command.arguments)
      ? command.arguments
          .map((entry) => normalizeArgumentInput(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
      : [],
    disabledByDefault: readOptionalBoolean(command.disabledByDefault),
    preferences: Array.isArray(command.preferences)
      ? command.preferences
          .map((entry) => normalizePreferenceInput(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
      : [],
  };
}

function normalizeManifestInput(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    name: readOptionalString(raw.name),
    title: readOptionalString(raw.title),
    description: readOptionalString(raw.description),
    icon: readOptionalString(raw.icon),
    author: normalizeAuthorInput(raw.author),
    owner: readOptionalString(raw.owner),
    version: readOptionalString(raw.version),
    access: readOptionalString(raw.access),
    license: readOptionalString(raw.license),
    platforms: readStringList(raw.platforms),
    categories: readStringList(raw.categories),
    contributors: readStringList(raw.contributors),
    pastContributors: readStringList(raw.pastContributors),
    keywords: readStringList(raw.keywords),
    commands: Array.isArray(raw.commands)
      ? raw.commands
          .map((entry) => normalizeCommandInput(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
      : [],
    preferences: Array.isArray(raw.preferences)
      ? raw.preferences
          .map((entry) => normalizePreferenceInput(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
      : [],
  };
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

function normalizeStringList(values: readonly string[]): string[] {
  return values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== undefined);
}

function normalizeArgument(argument: ArgumentDefinition): ExtensionArgument | null {
  const name = normalizeOptionalString(argument.name);
  const type = normalizeOptionalString(argument.type);
  if (!name || !type) {
    return null;
  }

  return {
    name,
    type,
    placeholder: normalizeOptionalString(argument.placeholder) ?? null,
    required: argument.required ?? null,
    data:
      argument.data.length > 0
        ? argument.data
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
            .filter((entry): entry is ExtensionArgumentOption => entry !== null)
        : null,
  };
}

function normalizeArguments(arguments_: readonly ArgumentDefinition[]): ExtensionArgument[] {
  return arguments_
    .map((argument) => normalizeArgument(argument))
    .filter((argument): argument is ExtensionArgument => argument !== null);
}

function normalizeCommand(command: CommandManifest): ExtensionCommandManifestRecord | null {
  const name = normalizeOptionalString(command.name);
  if (!name) {
    return null;
  }

  return {
    name,
    title: normalizeOptionalString(command.title),
    subtitle: normalizeOptionalString(command.subtitle),
    description: normalizeOptionalString(command.description),
    icon: normalizeOptionalString(command.icon),
    mode: normalizeOptionalString(command.mode),
    interval: normalizeOptionalString(command.interval),
    keywords: normalizeStringList(command.keywords),
    arguments: normalizeArguments(command.arguments),
    disabledByDefault: command.disabledByDefault ?? null,
    preferences: normalizePreferences(command.preferences),
  };
}

export function parseExtensionManifest(raw: unknown): ExtensionManifestRecord | null {
  try {
    const normalized = normalizeManifestInput(raw);
    if (!normalized) {
      return null;
    }

    const manifest = ExtensionManifest.fromJSON(normalized);
    return {
      name: normalizeOptionalString(manifest.name),
      title: normalizeOptionalString(manifest.title),
      description: normalizeOptionalString(manifest.description),
      icon: normalizeOptionalString(manifest.icon),
      author: normalizeAuthor(manifest.author),
      owner: normalizeOptionalString(manifest.owner),
      version: normalizeOptionalString(manifest.version),
      access: normalizeOptionalString(manifest.access),
      license: normalizeOptionalString(manifest.license),
      platforms: normalizeStringList(manifest.platforms),
      categories: normalizeStringList(manifest.categories),
      contributors: normalizeStringList(manifest.contributors),
      pastContributors: normalizeStringList(manifest.pastContributors),
      keywords: normalizeStringList(manifest.keywords),
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
      subtitle: normalizeOptionalString(plugin.subtitle),
      description: normalizeOptionalString(plugin.description),
      pluginTitle,
      pluginName,
      commandName,
      pluginPath,
      icon: normalizeOptionalString(plugin.icon),
      keywords: normalizeStringList(plugin.keywords),
      arguments: normalizeArguments(plugin.arguments),
      disabledByDefault: plugin.disabledByDefault ?? null,
      preferences: normalizePreferences(plugin.preferences),
      commandPreferences: normalizePreferences(plugin.commandPreferences),
      mode: normalizeOptionalString(plugin.mode),
      interval: normalizeOptionalString(plugin.interval),
      author: normalizeAuthor(plugin.author),
      owner: normalizeOptionalString(plugin.owner),
      version: normalizeOptionalString(plugin.version),
      access: normalizeOptionalString(plugin.access),
      license: normalizeOptionalString(plugin.license),
      platforms: normalizeStringList(plugin.platforms),
      categories: normalizeStringList(plugin.categories),
      contributors: normalizeStringList(plugin.contributors),
      pastContributors: normalizeStringList(plugin.pastContributors),
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
