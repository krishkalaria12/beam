import { Clipboard, Copy, Pin, PinOff, Tag, Type } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import type { EmojiData } from "@/modules/emoji/types";
import { CATEGORY_LABELS } from "@/modules/emoji/types";
import { useSetPinnedEmoji, usePinnedEmojis } from "@/modules/emoji/hooks/use-pinned-emojis";
import type { LauncherActionItem } from "@/modules/launcher/types";
import { invoke } from "@tauri-apps/api/core";

interface EmojiActionsState {
  selectedEmoji: EmojiData | null;
  onCopySelected?: () => Promise<void> | void;
}

const initialState: EmojiActionsState = {
  selectedEmoji: null,
};

const useEmojiActionsStore = create<EmojiActionsState>(() => initialState);

export function syncEmojiActionsState(nextState: EmojiActionsState) {
  const currentState = useEmojiActionsStore.getState();
  if (
    currentState.selectedEmoji === nextState.selectedEmoji &&
    currentState.onCopySelected === nextState.onCopySelected
  ) {
    return;
  }

  useEmojiActionsStore.setState(nextState);
}

export function clearEmojiActionsState() {
  useEmojiActionsStore.setState(initialState);
}

async function writeText(value: string) {
  await navigator.clipboard.writeText(value);
}

async function pasteEmoji(value: string) {
  await invoke("clipboard_paste", {
    content: { text: value },
  });
}

export function useEmojiActionItems(): LauncherActionItem[] {
  const { data: pinnedHexcodes = [] } = usePinnedEmojis();
  const setPinnedMutation = useSetPinnedEmoji();
  const state = useEmojiActionsStore();

  return useMemo(() => {
    const emoji = state.selectedEmoji;
    const hasSelection = !!emoji;
    const groupLabel = emoji ? CATEGORY_LABELS[emoji.group] : "";
    const isPinned = !!emoji && pinnedHexcodes.includes(emoji.hexcode.toUpperCase());

    return [
      {
        id: "emoji-copy",
        label: "Copy Emoji",
        description: emoji ? `${emoji.emoji} ${emoji.label}` : "Select an emoji first",
        icon: <Copy className="size-4" />,
        shortcut: "↩",
        disabled: !hasSelection,
        onSelect: () => {
          void state.onCopySelected?.();
        },
      },
      {
        id: "emoji-paste",
        label: "Paste",
        description: "Paste the selected emoji into the active app",
        icon: <Clipboard className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!emoji) return;
          void pasteEmoji(emoji.emoji);
        },
      },
      {
        id: "emoji-copy-name",
        label: "Copy Emoji Name",
        description: emoji ? emoji.label : "Select an emoji first",
        icon: <Type className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!emoji) return;
          void writeText(emoji.label);
        },
      },
      {
        id: "emoji-copy-group",
        label: "Copy Emoji Group",
        description: emoji ? groupLabel : "Select an emoji first",
        icon: <Tag className="size-4" />,
        disabled: !hasSelection,
        onSelect: () => {
          if (!emoji) return;
          void writeText(groupLabel);
        },
      },
      {
        id: "emoji-toggle-pin",
        label: isPinned ? "Unpin Emoji" : "Pin Emoji",
        description: hasSelection
          ? isPinned
            ? "Remove this emoji from the pinned set"
            : "Keep this emoji easy to reach"
          : "Select an emoji first",
        icon: isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />,
        disabled: !hasSelection || setPinnedMutation.isPending,
        onSelect: () => {
          if (!emoji) return;
          void setPinnedMutation.mutateAsync({
            hexcode: emoji.hexcode,
            pinned: !isPinned,
          });
        },
      },
    ];
  }, [pinnedHexcodes, setPinnedMutation, state]);
}
