import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { buildPreferenceValues } from "@/modules/extensions/components/extensions-view-model";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import type { ExtensionPreferenceField, PluginInfo } from "@/modules/extensions/types";
import { useSettingsPageStore } from "@/modules/settings/takeover/store/use-settings-page-store";

import { ExtensionsDetailPane } from "./components/extensions-detail-pane";
import { ExtensionsListPane } from "./components/extensions-list-pane";
import {
  buildExtensionSettingsGroups,
  filterExtensionSettingsGroups,
  isMissingRequiredField,
} from "./lib/build-extension-settings-groups";
import type { SelectedExtensionEntry, SettingsExtensionsTabProps } from "./types";

function areSelectionsEqual(
  left: SelectedExtensionEntry | null,
  right: SelectedExtensionEntry | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.kind !== right.kind || left.groupId !== right.groupId) {
    return false;
  }

  return left.kind === "group" || right.kind === "group" || left.commandId === right.commandId;
}

export function ExtensionsTab({
  isActive,
  hiddenCommandIds,
  aliasesById,
  onSetHidden,
  onSetAliases,
}: SettingsExtensionsTabProps) {
  const extensionTarget = useSettingsPageStore((state) => state.extensionTarget);
  const clearExtensionTarget = useSettingsPageStore((state) => state.clearExtensionTarget);
  const [query, setQuery] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedExtensionEntry | null>(null);
  const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
  const [preferenceDraftState, setPreferenceDraftState] = useState<{
    key: string;
    values: Record<string, unknown>;
    validationError: string | null;
    saveError: string | null;
  }>({
    key: "",
    values: {},
    validationError: null,
    saveError: null,
  });

  const pluginsQuery = useQuery<PluginInfo[]>({
    queryKey: ["settings-extension-plugins"],
    queryFn: getDiscoveredPlugins,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const plugins = pluginsQuery.data ?? [];
  const isLoading = pluginsQuery.isLoading;

  const groups = buildExtensionSettingsGroups(plugins);

  const filteredGroups = filterExtensionSettingsGroups(groups, query);
  const defaultExpandedGroupIds = useMemo(
    () =>
      new Set(
        (query.trim().length > 0 ? filteredGroups : groups).map((group) => group.id),
      ),
    [filteredGroups, groups, query],
  );

  if (expandedGroupIds.size === 0 && defaultExpandedGroupIds.size > 0) {
    setExpandedGroupIds(defaultExpandedGroupIds);
  }

  const resolvedExpandedGroupIds =
    query.trim().length > 0 ? defaultExpandedGroupIds : expandedGroupIds;

  const desiredSelected = useMemo<SelectedExtensionEntry | null>(() => {
    if (filteredGroups.length === 0) {
      return null;
    }

    if (
      selected &&
      filteredGroups.some((group) => {
        if (selected.kind === "group") {
          return group.id === selected.groupId;
        }

        return group.commands.some((command) => command.commandId === selected.commandId);
      })
    ) {
      return selected;
    }

    const firstGroup = filteredGroups[0];
    return firstGroup.commands.length > 0
      ? {
          kind: "command",
          groupId: firstGroup.id,
          commandId: firstGroup.commands[0].commandId,
        }
      : { kind: "group", groupId: firstGroup.id };
  }, [filteredGroups, selected]);

  if (!areSelectionsEqual(selected, desiredSelected)) {
    setSelected(desiredSelected);
  }

  if (isActive && extensionTarget && filteredGroups.length > 0) {
    const targetPluginName = extensionTarget.pluginName?.toLowerCase() ?? "";
    const targetCommandName = extensionTarget.commandName?.toLowerCase() ?? "";

    for (const group of filteredGroups) {
      if (targetPluginName && group.pluginName.toLowerCase() !== targetPluginName) {
        continue;
      }

      if (!resolvedExpandedGroupIds.has(group.id)) {
        setExpandedGroupIds((previous) => new Set(previous).add(group.id));
      }

      const targetSelection =
        targetCommandName.length > 0
          ? (() => {
              const matchedCommand = group.commands.find(
                (command) => command.commandName.toLowerCase() === targetCommandName,
              );

              return matchedCommand
                ? {
                    kind: "command" as const,
                    groupId: group.id,
                    commandId: matchedCommand.commandId,
                  }
                : null;
            })()
          : null;

      setSelected(targetSelection ?? { kind: "group", groupId: group.id });
      clearExtensionTarget();
      break;
    }
  }

  let selectedGroup = null;
  if (selected) {
    selectedGroup = filteredGroups.find((group) => group.id === selected.groupId) ?? null;
  }

  let selectedCommand = null;
  if (selected && selected.kind === "command" && selectedGroup) {
    selectedCommand =
      selectedGroup.commands.find((command) => command.commandId === selected.commandId) ?? null;
  }

  const selectedFields: ExtensionPreferenceField[] =
    selectedCommand?.fields ?? selectedGroup?.fields ?? [];
  const selectedPluginName = selectedCommand?.pluginName ?? selectedGroup?.pluginName ?? null;
  const selectedPreferencesQuery = useQuery({
    queryKey: ["settings-extension-preferences", selectedPluginName],
    queryFn: async () => extensionManagerService.getPreferences(selectedPluginName!),
    enabled: Boolean(selectedPluginName) && selectedFields.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const preferenceSeedValues = useMemo(
    () =>
      selectedPluginName && selectedFields.length > 0
        ? buildPreferenceValues(selectedFields, selectedPreferencesQuery.data ?? {})
        : {},
    [selectedFields, selectedPluginName, selectedPreferencesQuery.data],
  );
  const preferenceDraftKey =
    selectedPluginName && selectedFields.length > 0
      ? `${selectedPluginName}:${selectedPreferencesQuery.dataUpdatedAt}`
      : "";

  if (preferenceDraftState.key !== preferenceDraftKey) {
    setPreferenceDraftState({
      key: preferenceDraftKey,
      values: preferenceSeedValues,
      validationError: null,
      saveError: null,
    });
  }

  const isPreferenceLoading = selectedPreferencesQuery.isLoading;
  const preferenceError =
    preferenceDraftState.saveError ??
    (selectedPreferencesQuery.error instanceof Error
      ? selectedPreferencesQuery.error.message
      : null);
  const validationError = preferenceDraftState.validationError;

  const handleSavePreferences = async () => {
    if (!selectedPluginName || selectedFields.length === 0) {
      return;
    }

    const missingField = selectedFields.find((field) =>
      isMissingRequiredField(field, preferenceDraftState.values[field.name]),
    );
    if (missingField) {
      setPreferenceDraftState((previous) => ({
        ...previous,
        validationError: `"${missingField.title}" is required.`,
      }));
      return;
    }

    setPreferenceDraftState((previous) => ({
      ...previous,
      validationError: null,
      saveError: null,
    }));
    setIsPreferenceSaving(true);
    try {
      await extensionManagerService.setPreferences(selectedPluginName, preferenceDraftState.values);
    } catch (error) {
      setPreferenceDraftState((previous) => ({
        ...previous,
        saveError: error instanceof Error ? error.message : "Failed to save preferences.",
      }));
    } finally {
      setIsPreferenceSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid h-full min-h-0 flex-1 grid-cols-[58%_42%] overflow-hidden bg-[var(--command-item-selected-bg)]/30">
        <ExtensionsListPane
          isLoading={isLoading}
          query={query}
          groups={filteredGroups}
          expandedGroupIds={resolvedExpandedGroupIds}
          hiddenCommandIds={hiddenCommandIds}
          aliasesById={aliasesById}
          selected={selected}
          onQueryChange={setQuery}
          onToggleGroup={(groupId) => {
            setExpandedGroupIds((previous) => {
              const next = new Set(previous);
              if (next.has(groupId)) {
                next.delete(groupId);
              } else {
                next.add(groupId);
              }
              return next;
            });
          }}
          onSelect={setSelected}
          onSetHidden={onSetHidden}
          onSetAliases={onSetAliases}
        />

        <ExtensionsDetailPane
          selectedGroup={selectedGroup}
          selectedCommand={selectedCommand}
          selectedFields={selectedFields}
          preferenceValues={preferenceDraftState.values}
          isPreferenceLoading={isPreferenceLoading}
          isPreferenceSaving={isPreferenceSaving}
          preferenceError={preferenceError}
          validationError={validationError}
          onChangePreference={(key, value) => {
            setPreferenceDraftState((previous) => ({
              ...previous,
              values: {
                ...previous.values,
                [key]: value,
              },
              validationError: null,
              saveError: null,
            }));
          }}
          onSavePreferences={handleSavePreferences}
        />
      </div>
    </div>
  );
}
