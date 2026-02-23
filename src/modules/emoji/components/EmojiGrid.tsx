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
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground/50 animate-in fade-in zoom-in-95 duration-300">
        <span className="text-4xl opacity-50">😕</span>
        <span className="text-sm font-medium">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 min-h-[50vh]">
      {groupedEmojis.map(({ group, emojis: groupEmojis }) => (
        <div key={group} className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${group * 50}ms` }}>
          <div className="mb-4 flex items-center gap-4 py-2 opacity-80">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <h3 className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shadow-sm">
              {CATEGORY_LABELS[group]}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          </div>
          
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-3 content-start px-2">
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
