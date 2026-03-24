import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, Copy, Eraser, Hash, Pin, PinOff, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import {
  clearCalculatorHistory,
  deleteCalculatorHistoryEntry,
  pinnedCalculatorHistoryQueryKey,
} from "@/modules/calculator-history/api/history-actions";
import type { CalculatorHistoryEntry } from "@/modules/calculator-history/api/get-calculator-history";
import {
  usePinnedCalculatorHistory,
  useSetPinnedCalculatorHistoryEntry,
} from "@/modules/calculator-history/hooks/use-pinned-calculator-history";
import { useManagedItemActionItems } from "@/modules/launcher/managed-item-actions";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import { useManagedItemPreferencesStore } from "@/modules/launcher/managed-items";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface CalculatorHistoryActionsState {
  selectedEntry: CalculatorHistoryEntry | null;
}

const initialState: CalculatorHistoryActionsState = {
  selectedEntry: null,
};

const useCalculatorHistoryActionsStore = create<CalculatorHistoryActionsState>(() => initialState);

export function syncCalculatorHistoryActionsState(nextState: CalculatorHistoryActionsState) {
  const currentState = useCalculatorHistoryActionsStore.getState();
  if (currentState.selectedEntry === nextState.selectedEntry) {
    return;
  }

  useCalculatorHistoryActionsStore.setState(nextState);
}

export function clearCalculatorHistoryActionsState() {
  useCalculatorHistoryActionsStore.setState(initialState);
}

async function writeText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function toManagedCalculatorHistoryItem(entry: CalculatorHistoryEntry): LauncherManagedItem {
  return {
    kind: "calculator-history",
    id: String(entry.timestamp),
    title: `${entry.query} = ${entry.result}`,
    subtitle: new Date(entry.timestamp).toLocaleString(),
    keywords: [entry.query, entry.result],
    copyIdLabel: "Copy Entry ID",
    copyIdValue: String(entry.timestamp),
    supportsFavorite: true,
    supportsAlias: true,
    supportsResetRanking: true,
  };
}

export function useCalculatorHistoryActionItems(): LauncherActionItem[] {
  const queryClient = useQueryClient();
  const { data: pinnedTimestamps = [] } = usePinnedCalculatorHistory();
  const setPinnedMutation = useSetPinnedCalculatorHistoryEntry();
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);
  const state = useCalculatorHistoryActionsStore();
  const deleteMutation = useMutation({
    mutationFn: deleteCalculatorHistoryEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
      await queryClient.invalidateQueries({ queryKey: pinnedCalculatorHistoryQueryKey });
    },
  });
  const clearMutation = useMutation({
    mutationFn: clearCalculatorHistory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
      await queryClient.invalidateQueries({ queryKey: pinnedCalculatorHistoryQueryKey });
    },
  });
  const managedItem = state.selectedEntry
    ? toManagedCalculatorHistoryItem(state.selectedEntry)
    : null;
  const managedActionItems = useManagedItemActionItems(managedItem);

  return useMemo(() => {
    const entry = state.selectedEntry;
    const hasSelection = !!entry;
    const isPinned = !!entry && pinnedTimestamps.includes(entry.timestamp);

    return [
      {
        id: "calculator-copy-answer",
        label: "Copy Answer",
        description: hasSelection ? entry.result : "Select a history item first",
        icon: <Copy className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          if (!entry) return;
          recordUsage(toManagedCalculatorHistoryItem(entry));
          void writeText(entry.result);
        },
      },
      {
        id: "calculator-copy-question",
        label: "Copy Question",
        description: hasSelection ? entry.query : "Select a history item first",
        icon: <Hash className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!entry) return;
          recordUsage(toManagedCalculatorHistoryItem(entry));
          void writeText(entry.query);
        },
      },
      {
        id: "calculator-copy-question-answer",
        label: "Copy Question and Answer",
        description: "Copy the full equation and result",
        icon: <ClipboardCopy className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!entry) return;
          recordUsage(toManagedCalculatorHistoryItem(entry));
          void writeText(`${entry.query} = ${entry.result}`);
        },
      },
      {
        id: "calculator-delete-entry",
        label: "Delete Entry",
        description: "Remove the selected history item",
        icon: <Trash2 className="size-4" />,
        disabled: !hasSelection || deleteMutation.isPending,
        onSelect: () => {
          if (!entry) return;
          void deleteMutation.mutateAsync(entry);
        },
      },
      {
        id: "calculator-delete-all",
        label: "Delete All Entries",
        description: "Clear the calculator history list",
        icon: <Eraser className="size-4" />,
        disabled: clearMutation.isPending,
        onSelect: () => {
          void clearMutation.mutateAsync();
        },
      },
      {
        id: "calculator-toggle-pin",
        label: isPinned ? "Unpin Entry" : "Pin Entry",
        description: hasSelection
          ? isPinned
            ? "Remove this result from the pinned section"
            : "Keep this result pinned at the top"
          : "Select a history item first",
        icon: isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />,
        disabled: !hasSelection || setPinnedMutation.isPending,
        onSelect: () => {
          if (!entry) return;
          void setPinnedMutation.mutateAsync({ entry, pinned: !isPinned });
        },
      },
      ...managedActionItems,
    ];
  }, [
    clearMutation,
    deleteMutation,
    managedActionItems,
    pinnedTimestamps,
    recordUsage,
    setPinnedMutation,
    state,
  ]);
}
