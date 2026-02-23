import { cn } from "@/lib/utils";
import type { EmojiData } from "../types";

interface EmojiCardProps {
  emoji: EmojiData;
  onClick: (emoji: EmojiData) => void;
  className?: string;
}

export function EmojiCard({ emoji, onClick, className }: EmojiCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      className={cn(
        "group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-white/5 shadow-sm transition-all duration-200",
        "hover:bg-white/10 hover:border-white/10 hover:scale-105 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-95",
        className
      )}
      title={emoji.label}
    >
      <span className="text-3xl leading-none select-none filter drop-shadow-sm transition-transform group-hover:scale-110">
        {emoji.emoji}
      </span>
    </button>
  );
}
