import { Clock } from "lucide-react";
import { type EmojiData } from "../types";

interface RecentlyUsedProps {
  emojis: EmojiData[];
  onEmojiClick: (emoji: EmojiData) => void;
}

export function RecentlyUsed({ emojis, onEmojiClick }: RecentlyUsedProps) {
  if (emojis.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="size-3.5" />
        Recently Used
      </div>
      <div className="grid grid-cols-8 gap-2">
        {emojis.map((emoji, idx) => (
          <button
            key={`recent-${emoji.hexcode}-${idx}`}
            type="button"
            onClick={() => onEmojiClick(emoji)}
            className="flex aspect-square items-center justify-center rounded-xl border border-border/50 bg-accent text-[1.75rem] transition-all hover:border-border hover:bg-muted active:scale-95"
            title={emoji.label}
          >
            {emoji.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
