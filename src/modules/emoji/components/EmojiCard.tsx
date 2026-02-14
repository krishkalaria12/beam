import type { EmojiData } from "../types";

interface EmojiCardProps {
  emoji: EmojiData;
  onClick: (emoji: EmojiData) => void;
}

export function EmojiCard({ emoji, onClick }: EmojiCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      className="flex aspect-square items-center justify-center rounded-xl border border-border/50 bg-accent text-[1.75rem] transition-all hover:border-border hover:bg-muted active:scale-95"
      title={emoji.label}
    >
      {emoji.emoji}
    </button>
  );
}
