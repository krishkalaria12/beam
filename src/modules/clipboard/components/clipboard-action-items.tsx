import { AtSign, Copy, Keyboard } from "lucide-react";

import type { LauncherActionItem } from "@/modules/launcher/components/launcher-actions-panel";

import type { ClipboardHistoryEntry } from "../types";

interface BuildClipboardActionItemsParams {
  selectedEntry: ClipboardHistoryEntry | null;
  selectedIndex: number;
  onCopy: (entry: ClipboardHistoryEntry, index: number) => void;
}

export function buildClipboardActionItems({
  selectedEntry,
  selectedIndex,
  onCopy,
}: BuildClipboardActionItemsParams): LauncherActionItem[] {
  return [
    {
      id: "clipboard-copy",
      label: "Copy",
      icon: <Copy className="size-4" />,
      shortcut: "↩",
      keywords: ["copy", "clipboard", "entry"],
      disabled: !selectedEntry,
      onSelect: () => {
        if (!selectedEntry) {
          return;
        }
        onCopy(selectedEntry, selectedIndex);
      },
    },
    {
      id: "set-hotkey",
      label: "Set Hotkey...",
      icon: <Keyboard className="size-4" />,
      keywords: ["shortcut", "keys", "binding"],
      nextPageId: "hotkey",
      closeOnSelect: false,
    },
    {
      id: "set-alias",
      label: "Set Alias...",
      icon: <AtSign className="size-4" />,
      keywords: ["alias", "keyword", "trigger"],
      nextPageId: "alias",
      closeOnSelect: false,
    },
  ];
}
