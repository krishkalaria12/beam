import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { ExternalLink, FolderOpen, SquareTerminal } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import {
  buildApplicationTitle,
  toApplicationCommandId,
} from "@/command-registry/default-providers";
import type { Application } from "@/modules/applications/api/search-applications";
import { useManagedItemActionItems } from "@/modules/launcher/managed-item-actions";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface ApplicationActionsState {
  selectedApplication: Application | null;
  onOpen?: (application: Application) => void;
}

const initialState: ApplicationActionsState = {
  selectedApplication: null,
};

function getParentDirectory(filePath: string) {
  const lastSlash = filePath.lastIndexOf("/");
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : "/";
}

const useApplicationActionsStore = create<ApplicationActionsState>(() => initialState);

function syncApplicationActionsState(nextState: ApplicationActionsState) {
  const currentState = useApplicationActionsStore.getState();
  if (
    currentState.selectedApplication === nextState.selectedApplication &&
    currentState.onOpen === nextState.onOpen
  ) {
    return;
  }

  useApplicationActionsStore.setState(nextState);
}

function clearApplicationActionsState() {
  useApplicationActionsStore.setState(initialState);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function toManagedApplicationItem(application: Application): LauncherManagedItem {
  const commandTitle = buildApplicationTitle(application.name, application.exec_path);

  return {
    kind: "application",
    id: application.app_id || application.exec_path,
    title: commandTitle,
    subtitle: application.description,
    keywords: [application.app_id, application.exec_path, application.description].filter(Boolean),
    commandTarget: {
      commandId: toApplicationCommandId(commandTitle, application.exec_path),
      title: commandTitle,
    },
    copyIdLabel: "Copy App ID",
    copyIdValue: application.app_id || undefined,
    supportsFavorite: true,
    supportsAlias: true,
    supportsResetRanking: true,
  };
}

export function useApplicationActionItems(): LauncherActionItem[] {
  const state = useApplicationActionsStore();
  const managedItem = state.selectedApplication
    ? toManagedApplicationItem(state.selectedApplication)
    : null;
  const managedActionItems = useManagedItemActionItems(managedItem);

  return useMemo(() => {
    const application = state.selectedApplication;

    if (!application) {
      return [];
    }

    return [
      {
        id: "application-open",
        label: "Open Application",
        description: application.name,
        icon: <ExternalLink className="size-4" />,
        shortcut: "↩",
        onSelect: () => {
          state.onOpen?.(application);
        },
      },
      {
        id: "application-open-location",
        label: "Open Location",
        description: application.desktop_file_path || "Application location unavailable",
        icon: <FolderOpen className="size-4" />,
        disabled: !application.desktop_file_path,
        onSelect: () => {
          if (!application.desktop_file_path) return;
          void shellOpen(getParentDirectory(application.desktop_file_path));
        },
      },
      {
        id: "application-copy-command",
        label: "Copy Launch Command",
        description: application.exec_path || "Application command unavailable",
        icon: <SquareTerminal className="size-4" />,
        disabled: !application.exec_path,
        onSelect: () => {
          if (!application.exec_path) return;
          void copyText(application.exec_path);
        },
      },
      ...managedActionItems,
    ];
  }, [managedActionItems, state]);
}
