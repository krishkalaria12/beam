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

// Category icons/emojis for visual flair
const CATEGORY_ICONS: Record<number, string> = {
  0: "😀", // Smileys & Emotion
  1: "👋", // People & Body
  2: "🐶", // Animals & Nature
  3: "🍕", // Food & Drink
  4: "✈️", // Travel & Places
  5: "⚽", // Activities
  6: "💡", // Objects
  7: "🔣", // Symbols
  8: "🚩", // Flags
};

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
      <div className="emoji-empty flex h-64 flex-col items-center justify-center gap-4 text-white/40">
        <div className="relative">
          <span className="text-5xl opacity-70">😕</span>
          <div className="absolute inset-0 -z-10 blur-2xl bg-white/5 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[14px] font-medium tracking-[-0.02em] text-white/50">
            {emptyMessage}
          </span>
          <span className="text-[12px] text-white/30">Try a different search term</span>
        </div>
      </div>
    );
  }

  return (
    <div className="emoji-grid-container space-y-8 pb-20 min-h-[50vh]">
      {groupedEmojis.map(({ group, emojis: groupEmojis }, groupIndex) => (
        <div
          key={group}
          className="emoji-category"
          style={{ animationDelay: `${groupIndex * 40}ms` }}
        >
          {/* Category header - more refined */}
          <div className="mb-5 flex items-center gap-3">
            {/* Category icon */}
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
              <span className="text-base">{CATEGORY_ICONS[group] || "📦"}</span>
            </div>

            {/* Category label */}
            <div className="flex flex-col">
              <h3 className="text-[12px] font-semibold tracking-[-0.01em] text-white/60">
                {CATEGORY_LABELS[group]}
              </h3>
              <span className="text-[10px] text-white/25">
                {groupEmojis.length} emoji{groupEmojis.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Divider line */}
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
          </div>

          {/* Emoji grid - larger cells */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2.5 content-start">
            {groupEmojis.map((emoji, idx) => (
              <EmojiCard
                key={`${emoji.hexcode}-${idx}`}
                emoji={emoji}
                onClick={onEmojiClick}
                style={{ animationDelay: `${groupIndex * 40 + idx * 6}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
