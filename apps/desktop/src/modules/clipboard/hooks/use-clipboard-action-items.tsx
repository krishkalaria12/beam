import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clipboard, Copy, Eraser, Pin, PinOff, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import {
  clearClipboardHistory,
  deleteClipboardHistoryEntry,
  pasteClipboardHistoryEntry,
} from "@/modules/clipboard/api/history-actions";
import { emitClipboardHistoryUpdated } from "@/modules/clipboard/lib/updates";
import type { ClipboardHistoryEntry } from "@/modules/clipboard/types";
import {
  usePinnedClipboardHistory,
  useSetPinnedClipboardHistoryEntry,
} from "@/modules/clipboard/hooks/use-pinned-clipboard-history";
import { useManagedItemActionItems } from "@/modules/launcher/managed-item-actions";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import type { LauncherActionItem } from "@/modules/launcher/types";

export interface ClipboardActionsState {
  selectedEntry: ClipboardHistoryEntry | null;
  selectedIndex: number;
  onCopy?: () => Promise<void> | void;
}

const initialState: ClipboardActionsState = {
  selectedEntry: null,
  selectedIndex: -1,
};

const useClipboardActionsStore = create<ClipboardActionsState>(() => initialState);

export function syncClipboardActionsState(nextState: ClipboardActionsState) {
  const currentState = useClipboardActionsStore.getState();
  if (
    currentState.selectedEntry === nextState.selectedEntry &&
    currentState.selectedIndex === nextState.selectedIndex &&
    currentState.onCopy === nextState.onCopy
  ) {
    return;
  }

  useClipboardActionsStore.setState(nextState);
}

export function clearClipboardActionsState() {
  useClipboardActionsStore.setState(initialState);
}

function getClipboardEntryTitle(entry: ClipboardHistoryEntry): string {
  if (entry.content_type === "image") {
    return "Image clipboard item";
  }

  const trimmed = entry.value.trim();
  if (trimmed.length === 0) {
    return "Empty clipboard item";
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? trimmed;
  return firstLine.length > 72 ? `${firstLine.slice(0, 72).trimEnd()}...` : firstLine;
}

function hashClipboardValue(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function buildManagedClipboardEntryId(entry: ClipboardHistoryEntry): string {
  return `${entry.copied_at.trim()}::${hashClipboardValue(entry.value)}`;
}

export function toManagedClipboardItem(entry: ClipboardHistoryEntry): LauncherManagedItem {
  const entryId = buildManagedClipboardEntryId(entry);

  return {
    kind: "clipboard",
    id: entryId,
    title: getClipboardEntryTitle(entry),
    subtitle: entry.content_type,
    keywords: [entry.content_type],
    copyIdLabel: "Copy Entry ID",
    copyIdValue: entryId,
    supportsFavorite: true,
    supportsAlias: true,
    supportsResetRanking: true,
  };
}

export function useClipboardActionItems(): LauncherActionItem[] {
  const queryClient = useQueryClient();
  const { data: pinnedEntryIds = [] } = usePinnedClipboardHistory();
  const setPinnedMutation = useSetPinnedClipboardHistoryEntry();
  const state = useClipboardActionsStore();
  const deleteMutation = useMutation({
    mutationFn: deleteClipboardHistoryEntry,
    onSuccess: async () => {
      emitClipboardHistoryUpdated();
      await queryClient.invalidateQueries({ queryKey: ["clipboard", "history"] });
      await queryClient.invalidateQueries({ queryKey: ["clipboard", "pinned-entries"] });
    },
  });
  const clearMutation = useMutation({
    mutationFn: clearClipboardHistory,
    onSuccess: async () => {
      emitClipboardHistoryUpdated();
      await queryClient.invalidateQueries({ queryKey: ["clipboard", "history"] });
      await queryClient.invalidateQueries({ queryKey: ["clipboard", "pinned-entries"] });
    },
  });
  const managedItem = state.selectedEntry ? toManagedClipboardItem(state.selectedEntry) : null;
  const managedActionItems = useManagedItemActionItems(managedItem);

  return useMemo(() => {
    const entry = state.selectedEntry;
    const canPaste = !!entry && entry.content_type !== "image";
    const hasSelection = !!entry;
    const isPinned =
      !!entry && pinnedEntryIds.includes(`${entry.copied_at.trim()}::${entry.value}`);

    return [
      {
        id: "clipboard-copy",
        label: "Copy to Clipboard",
        description: entry ? `Copy item ${state.selectedIndex + 1} again` : "Select an item first",
        icon: <Copy className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          void state.onCopy?.();
        },
      },
      {
        id: "clipboard-paste",
        label: "Paste",
        description: canPaste
          ? "Paste selected clipboard text into the active app"
          : "Paste is unavailable for this item",
        icon: <Clipboard className="size-4" />,
        shortcut: "Ctrl+Shift+V",
        disabled: !canPaste,
        onSelect: () => {
          if (!entry || !canPaste) {
            return;
          }

          void pasteClipboardHistoryEntry(entry);
        },
      },
      {
        id: "clipboard-remove-entry",
        label: "Remove Entry",
        description: hasSelection
          ? "Delete the selected clipboard item from history"
          : "Select an item first",
        icon: <Trash2 className="size-4" />,
        disabled: !hasSelection || deleteMutation.isPending,
        onSelect: () => {
          if (!entry) {
            return;
          }

          void deleteMutation.mutateAsync(entry);
        },
      },
      {
        id: "clipboard-remove-all",
        label: "Remove All",
        description: "Clear the full clipboard history list",
        icon: <Eraser className="size-4" />,
        disabled: clearMutation.isPending,
        onSelect: () => {
          void clearMutation.mutateAsync();
        },
      },
      {
        id: "clipboard-toggle-pin",
        label: isPinned ? "Unpin Entry" : "Pin Entry",
        description: hasSelection
          ? isPinned
            ? "Remove this item from the pinned section"
            : "Keep this clipboard item pinned at the top"
          : "Select an item first",
        icon: isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />,
        disabled: !hasSelection || setPinnedMutation.isPending,
        onSelect: () => {
          if (!entry) {
            return;
          }

          void setPinnedMutation.mutateAsync({ entry, pinned: !isPinned });
        },
      },
      ...managedActionItems,
    ];
  }, [clearMutation, deleteMutation, managedActionItems, pinnedEntryIds, setPinnedMutation, state]);
}
