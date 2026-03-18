import { useEffect, useRef, useState } from "react";

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

export function ExtensionsTab({
  isActive,
  hiddenCommandIds,
  aliasesById,
  onSetHidden,
  onSetAliases,
}: SettingsExtensionsTabProps) {
  const extensionTarget = useSettingsPageStore((state) => state.extensionTarget);
  const clearExtensionTarget = useSettingsPageStore((state) => state.clearExtensionTarget);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedExtensionEntry | null>(null);
  const [isPreferenceLoading, setIsPreferenceLoading] = useState(false);
  const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
  const [preferenceValues, setPreferenceValues] = useState<Record<string, unknown>>({});
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasInitializedExpandedGroupsRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const loadPlugins = async () => {
      setIsLoading(true);
      try {
        const nextPlugins = await getDiscoveredPlugins();
        if (mounted) {
          setPlugins(nextPlugins);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPlugins().catch(() => {
      if (mounted) {
        setPlugins([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const groups = buildExtensionSettingsGroups(plugins);

  useEffect(() => {
    if (groups.length === 0 || hasInitializedExpandedGroupsRef.current) {
      return;
    }

    hasInitializedExpandedGroupsRef.current = true;
    setExpandedGroupIds(new Set(groups.map((group) => group.id)));
  }, [groups]);

  const filteredGroups = filterExtensionSettingsGroups(groups, query);

  useEffect(() => {
    if (query.trim().length === 0) {
      return;
    }

    setExpandedGroupIds(new Set(filteredGroups.map((group) => group.id)));
  }, [filteredGroups, query]);

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelected(null);
      return;
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
      return;
    }

    const firstGroup = filteredGroups[0];
    if (firstGroup.commands.length > 0) {
      setSelected({ kind: "command", groupId: firstGroup.id, commandId: firstGroup.commands[0].commandId });
    } else {
      setSelected({ kind: "group", groupId: firstGroup.id });
    }
  }, [filteredGroups, selected]);

  useEffect(() => {
    if (!isActive || !extensionTarget || filteredGroups.length === 0) {
      return;
    }

    const targetPluginName = extensionTarget.pluginName?.toLowerCase() ?? "";
    const targetCommandName = extensionTarget.commandName?.toLowerCase() ?? "";

    for (const group of filteredGroups) {
      if (targetPluginName && group.pluginName.toLowerCase() !== targetPluginName) {
        continue;
      }

      setExpandedGroupIds((previous) => {
        const next = new Set(previous);
        next.add(group.id);
        return next;
      });

      if (targetCommandName) {
        const matchedCommand = group.commands.find(
          (command) => command.commandName.toLowerCase() === targetCommandName,
        );
        if (matchedCommand) {
          setSelected({
            kind: "command",
            groupId: group.id,
            commandId: matchedCommand.commandId,
          });
          clearExtensionTarget();
          return;
        }
      }

      setSelected({ kind: "group", groupId: group.id });
      clearExtensionTarget();
      return;
    }
  }, [clearExtensionTarget, extensionTarget, filteredGroups, isActive]);

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

  useEffect(() => {
    if (!selectedPluginName || selectedFields.length === 0) {
      setPreferenceValues({});
      setPreferenceError(null);
      setValidationError(null);
      setIsPreferenceLoading(false);
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setIsPreferenceLoading(true);
    setPreferenceError(null);
    setValidationError(null);
    setPreferenceValues(buildPreferenceValues(selectedFields, {}));

    extensionManagerService
      .getPreferences(selectedPluginName)
      .then((savedValues) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setPreferenceValues(buildPreferenceValues(selectedFields, savedValues));
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setPreferenceError(error instanceof Error ? error.message : "Failed to load preferences.");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsPreferenceLoading(false);
        }
      });
  }, [selectedFields, selectedPluginName]);

  const handleSavePreferences = async () => {
    if (!selectedPluginName || selectedFields.length === 0) {
      return;
    }

    const missingField = selectedFields.find((field) =>
      isMissingRequiredField(field, preferenceValues[field.name]),
    );
    if (missingField) {
      setValidationError(`"${missingField.title}" is required.`);
      return;
    }

    setValidationError(null);
    setPreferenceError(null);
    setIsPreferenceSaving(true);
    try {
      await extensionManagerService.setPreferences(selectedPluginName, preferenceValues);
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : "Failed to save preferences.");
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
          expandedGroupIds={expandedGroupIds}
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
          preferenceValues={preferenceValues}
          isPreferenceLoading={isPreferenceLoading}
          isPreferenceSaving={isPreferenceSaving}
          preferenceError={preferenceError}
          validationError={validationError}
          onChangePreference={(key, value) => {
            setPreferenceValues((previous) => ({
              ...previous,
              [key]: value,
            }));
            setValidationError(null);
          }}
          onSavePreferences={handleSavePreferences}
        />
      </div>
    </div>
  );
}
