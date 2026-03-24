import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Copy, ExternalLink, FileCode2, FolderOpen, Type } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import type { FileEntry } from "@/modules/file-search/types";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface FileSearchActionsState {
  selectedFile: FileEntry | null;
  onOpenSelected?: () => Promise<void> | void;
}

const initialState: FileSearchActionsState = {
  selectedFile: null,
};

const useFileSearchActionsStore = create<FileSearchActionsState>(() => initialState);

export function syncFileSearchActionsState(nextState: FileSearchActionsState) {
  const currentState = useFileSearchActionsStore.getState();
  if (
    currentState.selectedFile === nextState.selectedFile &&
    currentState.onOpenSelected === nextState.onOpenSelected
  ) {
    return;
  }

  useFileSearchActionsStore.setState(nextState);
}

export function clearFileSearchActionsState() {
  useFileSearchActionsStore.setState(initialState);
}

function getParentDirectory(file: FileEntry): string {
  const lastSlash = file.path.lastIndexOf("/");
  return lastSlash > 0 ? file.path.slice(0, lastSlash) : "/";
}

function getFileTypeLabel(file: FileEntry): string {
  const dotIndex = file.name.lastIndexOf(".");
  const extension =
    dotIndex > 0
      ? file.name
          .slice(dotIndex + 1)
          .trim()
          .toLowerCase()
      : "";
  return extension ? `${extension.toUpperCase()} file` : "File";
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function useFileSearchActionItems(): LauncherActionItem[] {
  const state = useFileSearchActionsStore();

  return useMemo(() => {
    const file = state.selectedFile;
    const hasSelection = !!file;

    return [
      {
        id: "file-search-open",
        label: "Open",
        description: file ? file.name : "Select a file first",
        icon: <ExternalLink className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          void state.onOpenSelected?.();
        },
      },
      {
        id: "file-search-open-folder",
        label: "Open in Folder",
        description: file ? getParentDirectory(file) : "Select a file first",
        icon: <FolderOpen className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!file) return;
          void shellOpen(getParentDirectory(file));
        },
      },
      {
        id: "file-search-copy-path",
        label: "Copy File Path",
        description: file ? file.path : "Select a file first",
        icon: <Copy className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!file) return;
          void copyText(file.path);
        },
      },
      {
        id: "file-search-copy-name",
        label: "Copy File Name",
        description: file ? file.name : "Select a file first",
        icon: <Type className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!file) return;
          void copyText(file.name);
        },
      },
      {
        id: "file-search-copy-type",
        label: "Copy File Type",
        description: file ? getFileTypeLabel(file) : "Select a file first",
        icon: <FileCode2 className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!file) return;
          void copyText(getFileTypeLabel(file));
        },
      },
    ];
  }, [state]);
}
