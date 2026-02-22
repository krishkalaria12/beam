import type { ExtensionPreferenceField } from "@/modules/extensions/components/extension-preferences-dialog";
import type { PluginInfo, Preference } from "@/modules/extensions/types";

export interface InstalledExtensionSummary {
  id: string;
  slug: string;
  title: string;
  owner: string;
  description: string;
  commandCount: number;
  pluginName: string | null;
  preferences: ExtensionPreferenceField[];
}

interface GroupedInstalledExtension {
  id: string;
  slug: string;
  title: string;
  owner: string;
  description: string;
  commandCount: number;
  pluginName: string | null;
  preferenceMap: Map<string, ExtensionPreferenceField>;
}

function getPluginOwner(plugin: PluginInfo): string {
  if (plugin.owner && plugin.owner.trim().length > 0) {
    return plugin.owner.trim();
  }
  if (typeof plugin.author === "string") {
    return plugin.author.trim();
  }
  if (plugin.author && typeof plugin.author === "object" && "name" in plugin.author) {
    return plugin.author.name.trim();
  }
  return "extension";
}

function normalizePreferenceType(
  input: string | null | undefined,
): ExtensionPreferenceField["type"] {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "password") {
    return "password";
  }
  if (value === "dropdown") {
    return "dropdown";
  }
  if (value === "checkbox") {
    return "checkbox";
  }
  if (value === "textarea") {
    return "textarea";
  }
  return "textfield";
}

function normalizePreference(preference: Preference): ExtensionPreferenceField | null {
  const name = preference.name.trim();
  if (!name) {
    return null;
  }

  const titleFromPreference =
    (typeof preference.title === "string" ? preference.title : null) ??
    (typeof preference.label === "string" ? preference.label : null);
  const title = titleFromPreference?.trim() || name;
  const description = preference.description?.trim() || undefined;

  const options = (preference.data ?? [])
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry) => ({
      title: entry.title.trim() || entry.value.trim(),
      value: entry.value.trim(),
    }));

  const hasDefault =
    preference.default !== undefined &&
    preference.default !== null &&
    !(typeof preference.default === "string" && preference.default.length === 0);

  return {
    name,
    type: normalizePreferenceType(preference.type),
    title,
    description,
    required: Boolean(preference.required),
    defaultValue: hasDefault ? preference.default : undefined,
    options,
  };
}

function collectPreferences(plugin: PluginInfo): ExtensionPreferenceField[] {
  const rawPreferences = [...(plugin.preferences ?? []), ...(plugin.commandPreferences ?? [])];
  const unique = new Map<string, ExtensionPreferenceField>();

  for (const preference of rawPreferences) {
    const normalized = normalizePreference(preference);
    if (!normalized) {
      continue;
    }

    const key = normalized.name.toLowerCase();
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, normalized);
      continue;
    }

    if (!existing.description && normalized.description) {
      existing.description = normalized.description;
    }
    if (existing.defaultValue === undefined && normalized.defaultValue !== undefined) {
      existing.defaultValue = normalized.defaultValue;
    }
    if (existing.options.length === 0 && normalized.options.length > 0) {
      existing.options = normalized.options;
    }
    if (existing.type === "textfield" && normalized.type !== "textfield") {
      existing.type = normalized.type;
    }
    existing.required = existing.required || normalized.required;
  }

  return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function mergePreferences(
  group: GroupedInstalledExtension,
  preferences: ExtensionPreferenceField[],
): void {
  for (const preference of preferences) {
    const key = preference.name.toLowerCase();
    const existing = group.preferenceMap.get(key);
    if (!existing) {
      group.preferenceMap.set(key, { ...preference });
      continue;
    }

    if (!existing.description && preference.description) {
      existing.description = preference.description;
    }
    if (existing.defaultValue === undefined && preference.defaultValue !== undefined) {
      existing.defaultValue = preference.defaultValue;
    }
    if (existing.options.length === 0 && preference.options.length > 0) {
      existing.options = preference.options;
    }
    if (existing.type === "textfield" && preference.type !== "textfield") {
      existing.type = preference.type;
    }
    existing.required = existing.required || preference.required;
  }
}

function toInstalledSlug(plugin: PluginInfo): string {
  const pluginPath = plugin.pluginPath.trim();
  if (pluginPath.length > 0) {
    const parts = pluginPath.split(/[\\/]/).filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
  }
  return plugin.pluginName.trim();
}

export function toInstalledExtensionSummary(plugins: PluginInfo[]): InstalledExtensionSummary[] {
  const grouped = new Map<string, GroupedInstalledExtension>();

  for (const plugin of plugins) {
    const owner = getPluginOwner(plugin);
    const slug = toInstalledSlug(plugin);
    if (!slug) {
      continue;
    }

    const key = `${owner.toLowerCase()}::${slug.toLowerCase()}`;
    const existing = grouped.get(key);
    const pluginName = plugin.pluginName.trim() || null;
    const preferences = collectPreferences(plugin);
    if (existing) {
      existing.commandCount += 1;
      if (!existing.pluginName && pluginName) {
        existing.pluginName = pluginName;
      }
      mergePreferences(existing, preferences);
      continue;
    }

    grouped.set(key, {
      id: key,
      slug,
      owner: owner || "extension",
      title: plugin.pluginTitle.trim() || plugin.title.trim() || slug,
      description: (plugin.description ?? "").trim(),
      commandCount: 1,
      pluginName,
      preferenceMap: new Map(
        preferences.map((preference) => [preference.name.toLowerCase(), preference]),
      ),
    });
  }

  return [...grouped.values()]
    .map((group) => ({
      id: group.id,
      slug: group.slug,
      owner: group.owner,
      title: group.title,
      description: group.description,
      commandCount: group.commandCount,
      pluginName: group.pluginName,
      preferences: [...group.preferenceMap.values()].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function toSlugLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function toOptimisticInstalledEntry(slug: string): InstalledExtensionSummary {
  return {
    id: `optimistic::${slug.toLowerCase()}`,
    slug,
    owner: "extension",
    title: toSlugLabel(slug),
    description: "",
    commandCount: 0,
    pluginName: null,
    preferences: [],
  };
}

export function mergeInstalledWithOptimisticSlugs(
  installedExtensions: InstalledExtensionSummary[],
  optimisticInstalledSlugs: string[],
): InstalledExtensionSummary[] {
  const summaries = [...installedExtensions];
  const existingSlugs = new Set(summaries.map((entry) => entry.slug.toLowerCase()));

  for (const optimisticSlug of optimisticInstalledSlugs) {
    const slug = optimisticSlug.trim();
    if (!slug || existingSlugs.has(slug.toLowerCase())) {
      continue;
    }
    summaries.push(toOptimisticInstalledEntry(slug));
  }

  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}

export function buildPreferenceValues(
  definitions: ExtensionPreferenceField[],
  incomingValues: Record<string, unknown>,
): Record<string, unknown> {
  const nextValues: Record<string, unknown> = {};
  for (const definition of definitions) {
    if (Object.prototype.hasOwnProperty.call(incomingValues, definition.name)) {
      nextValues[definition.name] = incomingValues[definition.name];
      continue;
    }

    if (definition.defaultValue !== undefined) {
      nextValues[definition.name] = definition.defaultValue;
      continue;
    }

    if (definition.type === "checkbox") {
      nextValues[definition.name] = false;
      continue;
    }

    if (definition.type === "dropdown") {
      nextValues[definition.name] = definition.options[0]?.value ?? "";
      continue;
    }

    nextValues[definition.name] = "";
  }

  return nextValues;
}
