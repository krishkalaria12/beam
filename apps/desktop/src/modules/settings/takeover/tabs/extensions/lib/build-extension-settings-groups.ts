import { staticCommandRegistry } from "@/command-registry/registry";
import type { CommandDescriptor } from "@/command-registry/types";
import { toExtensionCommandDescriptorForPlugin } from "@/modules/extensions/extension-catalog";
import { getPluginAuthorPrefix } from "@/modules/extensions/extension-catalog";
import { resolveExtensionIconReference } from "@/modules/extensions/lib/icon";
import type { ExtensionPreferenceField, PluginInfo, Preference } from "@/modules/extensions/types";

import type { ExtensionGroupEntry } from "../types";

const BEAM_GROUP_ID = "beam::core";

function buildBeamCommandEntry(command: CommandDescriptor) {
  const title = command.title.trim() || command.id;
  const subtitle = command.subtitle?.trim() || "";
  const description =
    subtitle ||
    (command.kind === "panel"
      ? "Built-in Beam panel."
      : command.kind === "backend-action"
        ? "Built-in Beam system action."
        : "Built-in Beam command.");

  return {
    key: `${BEAM_GROUP_ID}::${command.id}`,
    commandId: command.id,
    commandName: command.id,
    title,
    subtitle,
    description,
    pluginName: "beam",
    pluginTitle: "Beam",
    owner: "beam",
    version: null,
    iconReference: typeof command.icon === "string" ? command.icon : null,
    keywords: [...command.keywords, command.id, command.endText ?? ""]
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    fields: [],
    sourceKind: "beam" as const,
  };
}

function buildBeamSettingsGroup(): ExtensionGroupEntry | null {
  const commands = staticCommandRegistry
    .getAll()
    .filter((command) => !command.hidden && Boolean(command.action))
    .map(buildBeamCommandEntry)
    .toSorted((left, right) => left.title.localeCompare(right.title));

  if (commands.length === 0) {
    return null;
  }

  return {
    id: BEAM_GROUP_ID,
    pluginName: "beam",
    title: "Beam",
    owner: "beam",
    version: null,
    description: "Built-in Beam panels, actions, and launcher commands.",
    iconReference: "settings",
    keywords: ["beam", "built-in", "core", "launcher", "settings", "commands"],
    fields: [],
    commands,
    sourceKind: "beam",
  };
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

  const options = (preference.data ?? [])
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry) => ({
      title: entry.title.trim() || entry.value.trim(),
      value: entry.value.trim(),
    }));

  const title =
    (typeof preference.title === "string" && preference.title.trim()) ||
    (typeof preference.label === "string" && preference.label.trim()) ||
    name;

  return {
    name,
    type: normalizePreferenceType(preference.type),
    title,
    description: preference.description?.trim() || undefined,
    required: Boolean(preference.required),
    defaultValue: preference.default,
    options,
  };
}

function collectFields(preferences: Preference[]): ExtensionPreferenceField[] {
  const deduped = new Map<string, ExtensionPreferenceField>();

  for (const preference of preferences) {
    const normalized = normalizePreference(preference);
    if (!normalized) {
      continue;
    }

    const key = normalized.name.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, normalized);
    }
  }

  return [...deduped.values()].sort((left, right) => left.title.localeCompare(right.title));
}

export function buildExtensionSettingsGroups(plugins: PluginInfo[]): ExtensionGroupEntry[] {
  const groups = new Map<string, ExtensionGroupEntry>();

  for (const plugin of plugins) {
    const pluginName = plugin.pluginName.trim();
    const owner = getPluginAuthorPrefix(plugin);
    const groupId = `${owner}::${pluginName.toLowerCase()}`;
    const existingGroup = groups.get(groupId);

    if (!existingGroup) {
      groups.set(groupId, {
        id: groupId,
        pluginName,
        title: plugin.pluginTitle.trim() || pluginName,
        owner,
        version: plugin.version?.trim() || null,
        description: plugin.description?.trim() || "",
        iconReference: resolveExtensionIconReference(plugin.icon),
        keywords: [
          plugin.pluginTitle,
          plugin.pluginName,
          plugin.description ?? "",
          owner,
          ...plugin.keywords,
        ]
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        fields: collectFields(plugin.preferences ?? []),
        commands: [],
        sourceKind: "extension",
      });
    }

    const group = groups.get(groupId)!;
    const commandId = toExtensionCommandDescriptorForPlugin(plugin).id;

    group.commands.push({
      key: `${groupId}::${commandId}`,
      commandId,
      commandName: plugin.commandName.trim(),
      title: plugin.title.trim() || plugin.commandName.trim() || pluginName,
      subtitle: plugin.subtitle?.trim() || "",
      description: plugin.description?.trim() || "",
      pluginName,
      pluginTitle: group.title,
      owner,
      version: plugin.version?.trim() || null,
      iconReference: resolveExtensionIconReference(plugin.icon),
      keywords: [
        plugin.title,
        plugin.subtitle ?? "",
        plugin.commandName,
        plugin.description ?? "",
        ...plugin.keywords,
      ]
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      fields: collectFields(plugin.commandPreferences ?? []),
      sourceKind: "extension",
    });
  }

  const beamGroup = buildBeamSettingsGroup();

  return [...(beamGroup ? [beamGroup] : []), ...groups.values()]
    .map((group) => ({
      ...group,
      commands: group.commands.toSorted((left, right) => left.title.localeCompare(right.title)),
    }))
    .toSorted((left, right) => {
      if (left.sourceKind !== right.sourceKind) {
        return left.sourceKind === "beam" ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });
}

export function filterExtensionSettingsGroups(groups: ExtensionGroupEntry[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return groups;
  }

  return groups.flatMap((group) => {
    const groupMatches = [
      group.title,
      group.pluginName,
      group.description,
      group.owner,
      ...group.keywords,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);

    const matchingCommands = group.commands.filter((command) =>
      [
        command.title,
        command.commandName,
        command.description,
        command.subtitle,
        ...command.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );

    if (!groupMatches && matchingCommands.length === 0) {
      return [];
    }

    return [
      {
        ...group,
        commands: groupMatches ? group.commands : matchingCommands,
      },
    ];
  });
}

export function isMissingRequiredField(field: ExtensionPreferenceField, value: unknown): boolean {
  if (!field.required) {
    return false;
  }

  if (field.type === "checkbox") {
    return value !== true;
  }

  return String(value ?? "").trim().length === 0;
}
