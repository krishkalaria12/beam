import { useMemo } from "react";
import { type EmojiData } from "../types";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "../types";
import { EmojiCard } from "./EmojiCard";

interface EmojiGridProps {
  emojis: EmojiData[];
  onEmojiClick: (emoji: EmojiData) => void;
  emptyMessage?: string;
}

interface GroupedEmojis {
  group: number;
  emojis: EmojiData[];
}

export function EmojiGrid({
  emojis,
  onEmojiClick,
  emptyMessage = "No emojis found",
}: EmojiGridProps) {
  const groupedEmojis = useMemo(() => {
    const groups: GroupedEmojis[] = [];
    
    for (const groupNum of CATEGORY_ORDER) {
      const groupEmojis = emojis.filter((emoji) => emoji.group === groupNum);
      if (groupEmojis.length > 0) {
        groups.push({ group: groupNum, emojis: groupEmojis });
      }
    }
    
    return groups;
  }, [emojis]);

  if (emojis.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedEmojis.map(({ group, emojis: groupEmojis }) => (
        <div key={group}>
          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-700" />
            <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {CATEGORY_LABELS[group]}
            </h3>
            <div className="h-px flex-1 bg-zinc-700" />
          </div>
          <div className="grid grid-cols-8 gap-2 content-start">
            {groupEmojis.map((emoji, idx) => (
              <EmojiCard
                key={`${emoji.hexcode}-${idx}`}
                emoji={emoji}
                onClick={onEmojiClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
