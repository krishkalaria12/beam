import { useMemo, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";

import { buildPreferenceValues } from "@/modules/extensions/components/extensions-view-model";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import type { ExtensionPreferenceField, PluginInfo } from "@/modules/extensions/types";
import { useSettingsPageStore } from "@/modules/settings/takeover/store/use-settings-page-store";

import { ExtensionsDetailPanel } from "./components/extensions-detail-panel";
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

interface ExtensionsTabState {
  query: string;
  expandedGroupIds: Set<string>;
  selected: SelectedExtensionEntry | null;
  isPreferenceSaving: boolean;
  preferenceDraftState: {
    key: string;
    values: Record<string, unknown>;
    validationError: string | null;
    saveError: string | null;
  };
}

type ExtensionsTabAction =
  | { type: "set-query"; value: string }
  | { type: "set-expanded-group-ids"; value: Set<string> }
  | { type: "toggle-group"; value: string }
  | { type: "set-selected"; value: SelectedExtensionEntry | null }
  | { type: "set-preference-saving"; value: boolean }
  | {
      type: "set-preference-draft-state";
      value: ExtensionsTabState["preferenceDraftState"];
    };

const INITIAL_EXTENSIONS_TAB_STATE: ExtensionsTabState = {
  query: "",
  expandedGroupIds: new Set(),
  selected: null,
  isPreferenceSaving: false,
  preferenceDraftState: {
    key: "",
    values: {},
    validationError: null,
    saveError: null,
  },
};

function extensionsTabReducer(
  state: ExtensionsTabState,
  action: ExtensionsTabAction,
): ExtensionsTabState {
  switch (action.type) {
    case "set-query":
      return { ...state, query: action.value };
    case "set-expanded-group-ids":
      return { ...state, expandedGroupIds: action.value };
    case "toggle-group": {
      const next = new Set(state.expandedGroupIds);
      if (next.has(action.value)) {
        next.delete(action.value);
      } else {
        next.add(action.value);
      }
      return { ...state, expandedGroupIds: next };
    }
    case "set-selected":
      return { ...state, selected: action.value };
    case "set-preference-saving":
      return { ...state, isPreferenceSaving: action.value };
    case "set-preference-draft-state":
      return { ...state, preferenceDraftState: action.value };
  }
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
  const [state, dispatch] = useReducer(extensionsTabReducer, INITIAL_EXTENSIONS_TAB_STATE);

  const pluginsQuery = useQuery<PluginInfo[]>({
    queryKey: ["settings-extension-plugins"],
    queryFn: getDiscoveredPlugins,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const plugins = pluginsQuery.data ?? [];
  const isLoading = pluginsQuery.isLoading;

  const groups = buildExtensionSettingsGroups(plugins);

  const filteredGroups = filterExtensionSettingsGroups(groups, state.query);
  const defaultExpandedGroupIds = useMemo(
    () =>
      new Set((state.query.trim().length > 0 ? filteredGroups : groups).map((group) => group.id)),
    [filteredGroups, groups, state.query],
  );

  if (state.expandedGroupIds.size === 0 && defaultExpandedGroupIds.size > 0) {
    dispatch({ type: "set-expanded-group-ids", value: defaultExpandedGroupIds });
  }

  const resolvedExpandedGroupIds =
    state.query.trim().length > 0 ? defaultExpandedGroupIds : state.expandedGroupIds;

  const desiredSelected = useMemo<SelectedExtensionEntry | null>(() => {
    if (filteredGroups.length === 0) {
      return null;
    }

    const selectedEntry = state.selected;

    if (
      selectedEntry &&
      filteredGroups.some((group) => {
        if (selectedEntry.kind === "group") {
          return group.id === selectedEntry.groupId;
        }

        return group.commands.some((command) => command.commandId === selectedEntry.commandId);
      })
    ) {
      return selectedEntry;
    }

    const firstGroup = filteredGroups[0];
    return firstGroup.commands.length > 0
      ? {
          kind: "command",
          groupId: firstGroup.id,
          commandId: firstGroup.commands[0].commandId,
        }
      : { kind: "group", groupId: firstGroup.id };
  }, [filteredGroups, state.selected]);

  if (!areSelectionsEqual(state.selected, desiredSelected)) {
    dispatch({ type: "set-selected", value: desiredSelected });
  }

  if (isActive && extensionTarget && filteredGroups.length > 0) {
    const targetPluginName = extensionTarget.pluginName?.toLowerCase() ?? "";
    const targetCommandName = extensionTarget.commandName?.toLowerCase() ?? "";

    for (const group of filteredGroups) {
      if (targetPluginName && group.pluginName.toLowerCase() !== targetPluginName) {
        continue;
      }

      if (!resolvedExpandedGroupIds.has(group.id)) {
        dispatch({
          type: "set-expanded-group-ids",
          value: new Set(resolvedExpandedGroupIds).add(group.id),
        });
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

      dispatch({
        type: "set-selected",
        value: targetSelection ?? { kind: "group", groupId: group.id },
      });
      clearExtensionTarget();
      break;
    }
  }

  let selectedGroup = null;
  const selectedEntry = state.selected;
  if (selectedEntry) {
    selectedGroup = filteredGroups.find((group) => group.id === selectedEntry.groupId) ?? null;
  }

  let selectedCommand = null;
  if (selectedEntry && selectedEntry.kind === "command" && selectedGroup) {
    selectedCommand =
      selectedGroup.commands.find((command) => command.commandId === selectedEntry.commandId) ??
      null;
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

  if (state.preferenceDraftState.key !== preferenceDraftKey) {
    dispatch({
      type: "set-preference-draft-state",
      value: {
        key: preferenceDraftKey,
        values: preferenceSeedValues,
        validationError: null,
        saveError: null,
      },
    });
  }

  const isPreferenceLoading = selectedPreferencesQuery.isLoading;
  const preferenceError =
    state.preferenceDraftState.saveError ??
    (selectedPreferencesQuery.error instanceof Error
      ? selectedPreferencesQuery.error.message
      : null);
  const validationError = state.preferenceDraftState.validationError;

  const handleSavePreferences = async () => {
    if (!selectedPluginName || selectedFields.length === 0) {
      return;
    }

    const missingField = selectedFields.find((field) =>
      isMissingRequiredField(field, state.preferenceDraftState.values[field.name]),
    );
    if (missingField) {
      dispatch({
        type: "set-preference-draft-state",
        value: {
          ...state.preferenceDraftState,
          validationError: `"${missingField.title}" is required.`,
        },
      });
      return;
    }

    dispatch({
      type: "set-preference-draft-state",
      value: {
        ...state.preferenceDraftState,
        validationError: null,
        saveError: null,
      },
    });
    dispatch({ type: "set-preference-saving", value: true });
    try {
      await extensionManagerService.setPreferences(
        selectedPluginName,
        state.preferenceDraftState.values,
      );
    } catch (error) {
      dispatch({
        type: "set-preference-draft-state",
        value: {
          ...state.preferenceDraftState,
          saveError: error instanceof Error ? error.message : "Failed to save preferences.",
        },
      });
    }

    dispatch({ type: "set-preference-saving", value: false });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid h-full min-h-0 flex-1 grid-cols-[58%_42%] overflow-hidden bg-[var(--command-item-selected-bg)]/30">
        <ExtensionsListPane
          isLoading={isLoading}
          query={state.query}
          groups={filteredGroups}
          expandedGroupIds={resolvedExpandedGroupIds}
          hiddenCommandIds={hiddenCommandIds}
          aliasesById={aliasesById}
          selected={state.selected}
          onQueryChange={(value) => dispatch({ type: "set-query", value })}
          onToggleGroup={(groupId) => dispatch({ type: "toggle-group", value: groupId })}
          onSelect={(value) => dispatch({ type: "set-selected", value })}
          onSetHidden={onSetHidden}
          onSetAliases={onSetAliases}
        />

        <ExtensionsDetailPanel
          selectedGroup={selectedGroup}
          selectedCommand={selectedCommand}
          selectedFields={selectedFields}
          preferenceValues={state.preferenceDraftState.values}
          isPreferenceLoading={isPreferenceLoading}
          isPreferenceSaving={state.isPreferenceSaving}
          preferenceError={preferenceError}
          validationError={validationError}
          onChangePreference={(key, value) => {
            dispatch({
              type: "set-preference-draft-state",
              value: {
                ...state.preferenceDraftState,
                values: {
                  ...state.preferenceDraftState.values,
                  [key]: value,
                },
                validationError: null,
                saveError: null,
              },
            });
          }}
          onSavePreferences={handleSavePreferences}
        />
      </div>
    </div>
  );
}
