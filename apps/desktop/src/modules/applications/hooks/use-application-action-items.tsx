import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Copy, ExternalLink, FolderOpen, SquareTerminal } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import type { Application } from "@/modules/applications/api/search-applications";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface ApplicationActionsState {
  selectedApplication: Application | null;
  onOpen?: (execPath: string) => void;
}

const initialState: ApplicationActionsState = {
  selectedApplication: null,
};

function getParentDirectory(filePath: string) {
  const lastSlash = filePath.lastIndexOf("/");
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : "/";
}

const useApplicationActionsStore = create<ApplicationActionsState>(() => initialState);

export function syncApplicationActionsState(nextState: ApplicationActionsState) {
  const currentState = useApplicationActionsStore.getState();
  if (
    currentState.selectedApplication === nextState.selectedApplication &&
    currentState.onOpen === nextState.onOpen
  ) {
    return;
  }

  useApplicationActionsStore.setState(nextState);
}

export function clearApplicationActionsState() {
  useApplicationActionsStore.setState(initialState);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function useApplicationActionItems(): LauncherActionItem[] {
  const state = useApplicationActionsStore();

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
          state.onOpen?.(application.exec_path);
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
        id: "application-copy-id",
        label: "Copy App ID",
        description: application.app_id || "Application id unavailable",
        icon: <Copy className="size-4" />,
        disabled: !application.app_id,
        onSelect: () => {
          if (!application.app_id) return;
          void copyText(application.app_id);
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
    ];
  }, [state]);
}
