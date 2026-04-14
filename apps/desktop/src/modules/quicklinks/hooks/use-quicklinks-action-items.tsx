import { CopyPlus, Pencil, Play, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import { toQuicklinkExecuteCommandId } from "@/command-registry/default-providers";
import { useManagedItemActionItems } from "@/modules/launcher/managed-item-actions";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import { useManagedItemPreferencesStore } from "@/modules/launcher/managed-items";
import { executeQuicklink } from "@/modules/quicklinks/api/quicklinks";
import type { Quicklink } from "@/modules/quicklinks/types";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface QuicklinksActionsState {
  selectedQuicklink: Quicklink | null;
  quicklinks: Quicklink[];
}

interface QuicklinksActionHandlers {
  onEdit?: (quicklink: Quicklink) => void;
  onDelete?: (keyword: string) => Promise<void> | void;
  onDuplicate?: (quicklink: Quicklink, quicklinks: Quicklink[]) => Promise<void> | void;
}

const initialState: QuicklinksActionsState = {
  selectedQuicklink: null,
  quicklinks: [],
};

const useQuicklinksActionsStore = create<QuicklinksActionsState>(() => initialState);
let quicklinksActionHandlers: QuicklinksActionHandlers = {};

function areQuicklinksEqual(left: Quicklink | null, right: Quicklink | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.keyword === right.keyword &&
    left.name === right.name &&
    left.url === right.url &&
    left.icon === right.icon
  );
}

function areQuicklinkListsEqual(left: Quicklink[], right: Quicklink[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!areQuicklinksEqual(left[index] ?? null, right[index] ?? null)) {
      return false;
    }
  }

  return true;
}

export function syncQuicklinksActionsState(
  nextState: QuicklinksActionsState & QuicklinksActionHandlers,
) {
  quicklinksActionHandlers = {
    onEdit: nextState.onEdit,
    onDelete: nextState.onDelete,
    onDuplicate: nextState.onDuplicate,
  };

  const currentState = useQuicklinksActionsStore.getState();
  if (
    areQuicklinksEqual(currentState.selectedQuicklink, nextState.selectedQuicklink) &&
    areQuicklinkListsEqual(currentState.quicklinks, nextState.quicklinks)
  ) {
    return;
  }

  useQuicklinksActionsStore.setState({
    selectedQuicklink: nextState.selectedQuicklink,
    quicklinks: nextState.quicklinks,
  });
}

export function clearQuicklinksActionsState() {
  quicklinksActionHandlers = {};
  useQuicklinksActionsStore.setState(initialState);
}

export function buildDuplicateKeyword(keyword: string, quicklinks: Quicklink[]) {
  const normalized = keyword.trim().toLowerCase();
  const existing = new Set(quicklinks.map((entry) => entry.keyword.trim().toLowerCase()));
  if (!existing.has(`${normalized}_copy`)) {
    return `${keyword}_copy`;
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${keyword}_copy_${index}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${keyword}_${Date.now()}`;
}

export function buildDuplicateName(name: string, quicklinks: Quicklink[]) {
  const existing = new Set(quicklinks.map((entry) => entry.name.trim().toLowerCase()));
  if (!existing.has(`${name} copy`.toLowerCase())) {
    return `${name} copy`;
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${name} copy ${index}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${name} ${Date.now()}`;
}

export function toManagedQuicklinkItem(
  quicklink: Quicklink,
  quicklinks: readonly Quicklink[] = [],
): LauncherManagedItem {
  return {
    kind: "quicklink",
    id: quicklink.keyword,
    title: quicklink.name,
    subtitle: quicklink.url,
    keywords: [quicklink.keyword, quicklink.url],
    reservedAliases: quicklinks
      .map((entry) => entry.keyword)
      .filter((keyword) => keyword.trim().toLowerCase() !== quicklink.keyword.trim().toLowerCase()),
    commandTarget: {
      commandId: toQuicklinkExecuteCommandId(quicklink.keyword),
      title: quicklink.name,
    },
    copyIdLabel: "Copy Quicklink ID",
    copyIdValue: quicklink.keyword,
    supportsFavorite: true,
    supportsAlias: true,
    supportsResetRanking: true,
  };
}

export function useQuicklinksActionItems(): LauncherActionItem[] {
  const state = useQuicklinksActionsStore();
  const recordUsage = useManagedItemPreferencesStore((store) => store.recordUsage);
  const managedItem = state.selectedQuicklink
    ? toManagedQuicklinkItem(state.selectedQuicklink, state.quicklinks)
    : null;
  const managedActionItems = useManagedItemActionItems(managedItem);

  return useMemo(() => {
    const quicklink = state.selectedQuicklink;
    const hasSelection = !!quicklink;

    return [
      {
        id: "quicklink-open",
        label: "Open",
        description: quicklink ? quicklink.url : "Select a quicklink first",
        icon: <Play className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          if (!quicklink) return;
          recordUsage(toManagedQuicklinkItem(quicklink));
          void executeQuicklink(quicklink.keyword, "");
        },
      },
      {
        id: "quicklink-edit",
        label: "Edit",
        description: quicklink ? `Update ${quicklink.name}` : "Select a quicklink first",
        icon: <Pencil className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!quicklink) return;
          quicklinksActionHandlers.onEdit?.(quicklink);
        },
      },
      {
        id: "quicklink-duplicate",
        label: "Duplicate",
        description: "Create a copy with a new keyword",
        icon: <CopyPlus className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!quicklink) return;
          void quicklinksActionHandlers.onDuplicate?.(quicklink, state.quicklinks);
        },
      },
      {
        id: "quicklink-remove",
        label: "Remove",
        description: quicklink ? `Delete ${quicklink.name}` : "Select a quicklink first",
        icon: <Trash2 className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!quicklink) return;
          void quicklinksActionHandlers.onDelete?.(quicklink.keyword);
        },
      },
      ...managedActionItems,
    ];
  }, [managedActionItems, recordUsage, state]);
}
