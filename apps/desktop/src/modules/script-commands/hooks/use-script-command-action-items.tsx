import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Copy, FolderOpen, Play, SquarePen } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import { createScriptRunCommandId } from "@/modules/script-commands/script-commands-provider";
import { useManagedItemActionItems } from "@/modules/launcher/managed-item-actions";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import type { LauncherActionItem } from "@/modules/launcher/types";
import type { ScriptCommandSummary } from "@/modules/script-commands/types";

interface ScriptCommandActionsState {
  selectedScript: ScriptCommandSummary | null;
}

interface ScriptCommandActionHandlers {
  onRunSelected?: () => Promise<void> | void;
}

function getParentDirectory(filePath: string) {
  const lastSlash = filePath.lastIndexOf("/");
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : "/";
}

const initialState: ScriptCommandActionsState = {
  selectedScript: null,
};

const useScriptCommandActionsStore = create<ScriptCommandActionsState>(() => initialState);
let scriptCommandActionHandlers: ScriptCommandActionHandlers = {};

function areScriptsEqual(left: ScriptCommandSummary | null, right: ScriptCommandSummary | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.title === right.title &&
    left.subtitle === right.subtitle &&
    left.scriptPath === right.scriptPath
  );
}

export function syncScriptCommandActionsState(
  nextState: ScriptCommandActionsState & ScriptCommandActionHandlers,
) {
  scriptCommandActionHandlers = {
    onRunSelected: nextState.onRunSelected,
  };

  const currentState = useScriptCommandActionsStore.getState();
  if (areScriptsEqual(currentState.selectedScript, nextState.selectedScript)) {
    return;
  }

  useScriptCommandActionsStore.setState({ selectedScript: nextState.selectedScript });
}

export function clearScriptCommandActionsState() {
  scriptCommandActionHandlers = {};
  useScriptCommandActionsStore.setState(initialState);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function toManagedScriptCommandItem(script: ScriptCommandSummary): LauncherManagedItem {
  return {
    kind: "script",
    id: script.id,
    title: script.title,
    subtitle: script.subtitle,
    keywords: [script.scriptName, script.scriptPath, script.subtitle].filter(Boolean),
    commandTarget: {
      commandId: createScriptRunCommandId(script.id),
      title: script.title,
    },
    copyIdLabel: "Copy Script ID",
    copyIdValue: script.id,
    supportsFavorite: true,
    supportsAlias: true,
    supportsResetRanking: true,
  };
}

export function useScriptCommandActionItems(): LauncherActionItem[] {
  const state = useScriptCommandActionsStore();
  const managedItem = state.selectedScript
    ? toManagedScriptCommandItem(state.selectedScript)
    : null;
  const managedActionItems = useManagedItemActionItems(managedItem);

  return useMemo(() => {
    const script = state.selectedScript;
    const hasSelection = !!script;

    return [
      {
        id: "script-run",
        label: "Run",
        description: script ? script.title : "Select a script first",
        icon: <Play className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          void scriptCommandActionHandlers.onRunSelected?.();
        },
      },
      {
        id: "script-open",
        label: "Open Script",
        description: script ? script.scriptPath : "Select a script first",
        icon: <SquarePen className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!script) return;
          void shellOpen(script.scriptPath);
        },
      },
      {
        id: "script-open-folder",
        label: "Open Script Directory",
        description: script ? getParentDirectory(script.scriptPath) : "Select a script first",
        icon: <FolderOpen className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!script) return;
          void shellOpen(getParentDirectory(script.scriptPath));
        },
      },
      {
        id: "script-copy-path",
        label: "Copy Path to Script",
        description: script ? script.scriptPath : "Select a script first",
        icon: <Copy className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!script) return;
          void copyText(script.scriptPath);
        },
      },
      ...managedActionItems,
    ];
  }, [managedActionItems, state]);
}
