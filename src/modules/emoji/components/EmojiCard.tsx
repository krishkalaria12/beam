import { cn } from "@/lib/utils";
import type { EmojiData } from "../types";
import type { CSSProperties } from "react";

interface EmojiCardProps {
  emoji: EmojiData;
  onClick: (emoji: EmojiData) => void;
  className?: string;
  style?: CSSProperties;
  isSelected?: boolean;
  isRecent?: boolean;
}

export function EmojiCard({
  emoji,
  onClick,
  className,
  style,
  isSelected,
  isRecent,
}: EmojiCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      style={style}
      className={cn(
        "emoji-card group relative flex items-center justify-center transition-all duration-150",
        "aspect-square rounded-xl",
        "bg-white/[0.03] ring-1 ring-inset ring-white/[0.05]",
        "hover:bg-white/[0.08] hover:ring-white/[0.12]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--solid-accent,#4ea2ff)]/60",
        "active:scale-95 active:duration-75",
        (isSelected || isRecent) &&
          "ring-2 ring-[var(--solid-accent,#4ea2ff)]/50 bg-[var(--solid-accent,#4ea2ff)]/[0.08]",
        className,
      )}
    >
      {/* Emoji character */}
      <span className="text-[1.75rem] leading-none select-none transition-transform duration-150 group-hover:scale-110">
        {emoji.emoji}
      </span>
    </button>
  );
}
