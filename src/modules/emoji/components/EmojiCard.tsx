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
      className="flex aspect-square items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800 text-[1.75rem] transition-all hover:border-zinc-600 hover:bg-zinc-700 active:scale-95"
      title={emoji.label}
    >
      {emoji.emoji}
    </button>
  );
}
