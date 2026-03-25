import { AtSign, Copy, Keyboard, RotateCcw, Settings2, Star } from "lucide-react";
import { useMemo } from "react";

import type { LauncherActionItem } from "@/modules/launcher/types";
import type { LauncherManagedItem } from "@/modules/launcher/managed-items";
import {
  getManagedItemAliases,
  getManagedItemPreferenceId,
  useManagedItemPreferencesStore,
} from "@/modules/launcher/managed-items";

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

const EMPTY_ACTIONS: LauncherActionItem[] = [];

export function useManagedItemActionItems(item: LauncherManagedItem | null): LauncherActionItem[] {
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const setFavorite = useManagedItemPreferencesStore((state) => state.setFavorite);
  const resetUsage = useManagedItemPreferencesStore((state) => state.resetUsage);
  const itemId = item ? getManagedItemPreferenceId(item) : "";
  const aliases = item ? getManagedItemAliases(aliasesById, item) : [];
  const isFavorite = itemId ? favoriteIds.includes(itemId) : false;

  return useMemo(() => {
    if (!item) {
      return EMPTY_ACTIONS;
    }

    const target = {
      kind: "managed-item" as const,
      item,
    };

    const items: LauncherActionItem[] = [];

    if (item.supportsFavorite) {
      items.push({
        id: `${itemId}-favorite-toggle`,
        label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
        description: isFavorite
          ? `Stop prioritizing ${item.title}`
          : `Boost ${item.title} in this module`,
        icon: <Star className="size-4" />,
        keywords: ["favorite", "star", item.kind],
        onSelect: () => {
          setFavorite(item, !isFavorite);
        },
      });
    }

    if (item.commandTarget) {
      items.push({
        id: `${itemId}-set-hotkey`,
        label: "Set Hotkey...",
        description: `Assign a shortcut for ${item.title}`,
        icon: <Keyboard className="size-4" />,
        keywords: ["hotkey", "shortcut", "keys", item.kind],
        nextPageId: "hotkey",
        nextPageTarget: {
          kind: "command",
          commandId: item.commandTarget.commandId,
          title: item.commandTarget.title ?? item.title,
        },
        closeOnSelect: false,
      });
    }

    if (item.supportsAlias) {
      items.push({
        id: `${itemId}-set-alias`,
        label: "Set Alias...",
        description: aliases[0]
          ? `Current alias: ${aliases[0]}`
          : `Create a custom alias for ${item.title}`,
        icon: <AtSign className="size-4" />,
        keywords: ["alias", "keyword", "trigger", item.kind],
        nextPageId: "alias",
        nextPageTarget: target,
        closeOnSelect: false,
      });
    }

    if (item.supportsResetRanking) {
      items.push({
        id: `${itemId}-reset-ranking`,
        label: "Reset Ranking",
        description: `Clear saved usage history for ${item.title}`,
        icon: <RotateCcw className="size-4" />,
        keywords: ["reset", "ranking", "usage", item.kind],
        onSelect: () => {
          resetUsage(item);
        },
      });
    }

    if (item.onOpenPreferences) {
      items.push({
        id: `${itemId}-open-preferences`,
        label: "Open Preferences",
        description: `Open settings for ${item.title}`,
        icon: <Settings2 className="size-4" />,
        keywords: ["settings", "preferences", "config", item.kind],
        onSelect: () => {
          item.onOpenPreferences?.();
        },
      });
    }

    if (item.copyIdValue?.trim()) {
      items.push({
        id: `${itemId}-copy-id`,
        label: item.copyIdLabel ?? "Copy ID",
        description: item.copyIdValue,
        icon: <Copy className="size-4" />,
        keywords: ["copy", "id", item.kind],
        onSelect: () => {
          void copyText(item.copyIdValue!);
        },
      });
    }

    return items;
  }, [aliases, isFavorite, item, itemId, resetUsage, setFavorite]);
}
