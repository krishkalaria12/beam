import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onClick(emoji)}
      style={style}
      className={cn(
        "emoji-card group relative flex items-center justify-center transition-all duration-150",
        "!h-auto !w-full aspect-square rounded-xl p-0",
        "bg-[var(--launcher-card-hover-bg)] ring-1 ring-inset ring-[var(--launcher-card-border)]",
        "hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-selected-border)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/60",
        "active:scale-95 active:duration-75",
        (isSelected || isRecent) && "ring-2 ring-[var(--ring)]/50 bg-[var(--ring)]/[0.08]",
        className,
      )}
    >
      {/* Emoji character */}
      <span className="text-[2rem] leading-none select-none transition-transform duration-150 group-hover:scale-110">
        {emoji.emoji}
      </span>
    </Button>
  );
}
