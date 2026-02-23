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
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-4 flex items-center gap-4 py-2 opacity-80">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shadow-sm">
          <Clock className="size-3" />
          <span>Recently Used</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
      </div>
      
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-3 px-2">
        {emojis.map((emoji, idx) => (
          <EmojiCard
            key={`recent-${emoji.hexcode}-${idx}`}
            emoji={emoji}
            onClick={onEmojiClick}
            className="border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
          />
        ))}
      </div>
    </div>
  );
}
