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
      {/* Section header - minimal */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Recent
        </span>
        <div className="h-px flex-1 bg-[var(--ui-divider)]" />
      </div>

      {/* Fixed 8-column layout using full row width */}
      <div className="grid w-full grid-cols-8 gap-2.5">
        {emojis.slice(0, 16).map((emoji, idx) => (
          <EmojiCard
            key={`recent-${emoji.hexcode}-${idx}`}
            emoji={emoji}
            onClick={onEmojiClick}
            isRecent
            style={{ animationDelay: `${idx * 12}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
