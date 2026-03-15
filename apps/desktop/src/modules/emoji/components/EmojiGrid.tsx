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
      <div className="emoji-empty flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
        <span className="text-4xl opacity-60">😕</span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-medium">{emptyMessage}</span>
          <span className="text-[11px]">Try a different search term</span>
        </div>
      </div>
    );
  }

  return (
    <div className="emoji-grid-container space-y-6">
      {groupedEmojis.map(({ group, emojis: groupEmojis }, groupIndex) => (
        <div
          key={group}
          className="emoji-category"
          style={{ animationDelay: `${groupIndex * 30}ms` }}
        >
          {/* Category header - minimal */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {CATEGORY_LABELS[group]}
            </span>
            <div className="h-px flex-1 bg-[var(--ui-divider)]" />
          </div>

          {/* Fixed 8-column layout using full row width */}
          <div className="grid w-full grid-cols-8 gap-2.5">
            {groupEmojis.map((emoji, idx) => (
              <EmojiCard
                key={`${emoji.hexcode}-${idx}`}
                emoji={emoji}
                onClick={onEmojiClick}
                style={{ animationDelay: `${Math.min(idx, 16) * 8}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
