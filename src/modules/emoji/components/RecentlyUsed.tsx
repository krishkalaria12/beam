import { Clock } from "lucide-react";
import { type EmojiData } from "../types";
import { EmojiCard } from "./EmojiCard";

interface RecentlyUsedProps {
  emojis: EmojiData[];
  onEmojiClick: (emoji: EmojiData) => void;
}

export function RecentlyUsed({ emojis, onEmojiClick }: RecentlyUsedProps) {
  if (emojis.length === 0) return null;

  return (
    <div className="emoji-recent">
      {/* Section header - matches EmojiGrid style */}
      <div className="mb-5 flex items-center gap-3">
        {/* Icon container with accent color */}
        <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--solid-accent,#4ea2ff)]/10 ring-1 ring-[var(--solid-accent,#4ea2ff)]/20">
          <Clock className="size-3.5 text-[var(--solid-accent,#4ea2ff)]" />
        </div>

        {/* Label */}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-semibold tracking-[-0.01em] text-white/60">
            Recently Used
          </h3>
          <span className="text-[10px] text-white/25">
            {emojis.length} emoji{emojis.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Divider line */}
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--solid-accent,#4ea2ff)]/15 to-transparent" />
      </div>

      {/* Recent emojis grid - larger cells matching main grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2.5">
        {emojis.map((emoji, idx) => (
          <EmojiCard
            key={`recent-${emoji.hexcode}-${idx}`}
            emoji={emoji}
            onClick={onEmojiClick}
            isRecent
            style={{ animationDelay: `${idx * 15}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
