import { CopyPlus, Pencil, Play, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import { executeQuicklink } from "@/modules/quicklinks/api/quicklinks";
import type { Quicklink } from "@/modules/quicklinks/types";
import type { LauncherActionItem } from "@/modules/launcher/types";

interface QuicklinksActionsState {
  selectedQuicklink: Quicklink | null;
  quicklinks: Quicklink[];
  onEdit?: (quicklink: Quicklink) => void;
  onDelete?: (keyword: string) => Promise<void> | void;
  onDuplicate?: (quicklink: Quicklink, quicklinks: Quicklink[]) => Promise<void> | void;
}

const initialState: QuicklinksActionsState = {
  selectedQuicklink: null,
  quicklinks: [],
};

const useQuicklinksActionsStore = create<QuicklinksActionsState>(() => initialState);

export function syncQuicklinksActionsState(nextState: QuicklinksActionsState) {
  const currentState = useQuicklinksActionsStore.getState();
  if (
    currentState.selectedQuicklink === nextState.selectedQuicklink &&
    currentState.quicklinks === nextState.quicklinks &&
    currentState.onEdit === nextState.onEdit &&
    currentState.onDelete === nextState.onDelete &&
    currentState.onDuplicate === nextState.onDuplicate
  ) {
    return;
  }

  useQuicklinksActionsStore.setState(nextState);
}

export function clearQuicklinksActionsState() {
  useQuicklinksActionsStore.setState(initialState);
}

export function buildDuplicateKeyword(keyword: string, quicklinks: Quicklink[]) {
  const normalized = keyword.trim().toLowerCase();
  const existing = new Set(quicklinks.map((entry) => entry.keyword.trim().toLowerCase()));
  if (!existing.has(`${normalized}-copy`)) {
    return `${keyword}-copy`;
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${keyword}-copy-${index}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${keyword}-${Date.now()}`;
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

export function useQuicklinksActionItems(): LauncherActionItem[] {
  const state = useQuicklinksActionsStore();

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
          state.onEdit?.(quicklink);
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
          void state.onDuplicate?.(quicklink, state.quicklinks);
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
          void state.onDelete?.(quicklink.keyword);
        },
      },
    ];
  }, [state]);
}
