import { cn } from "@/lib/utils";
import type { EmojiData } from "../types";
import type { CSSProperties } from "react";

interface EmojiCardProps {
  emoji: EmojiData;
  onClick: (emoji: EmojiData) => void;
  className?: string;
  style?: CSSProperties;
  isRecent?: boolean;
}

export function EmojiCard({ emoji, onClick, className, style, isRecent }: EmojiCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      style={style}
      className={cn(
        "emoji-card group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl transition-all duration-200",
        "bg-white/[0.025] ring-1 ring-inset ring-white/[0.04]",
        "hover:bg-white/[0.07] hover:ring-white/[0.10] hover:scale-[1.08] hover:shadow-lg hover:shadow-black/20",
        "focus:outline-none focus:ring-2 focus:ring-[var(--solid-accent,#4ea2ff)]/50",
        "active:scale-[0.96] active:duration-75",
        isRecent && "ring-[var(--solid-accent,#4ea2ff)]/25 bg-[var(--solid-accent,#4ea2ff)]/[0.08]",
        className,
      )}
      title={emoji.label}
    >
      {/* Emoji character - larger and more prominent */}
      <span className="text-[2rem] leading-none select-none transition-transform duration-200 group-hover:scale-110 drop-shadow-sm">
        {emoji.emoji}
      </span>

      {/* Gradient shine overlay on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Left accent bar on hover */}
      <div className="pointer-events-none absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--solid-accent,#4ea2ff)] opacity-0 transition-all duration-200 group-hover:opacity-100" />

      {/* Recent indicator glow */}
      {isRecent && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--solid-accent,#4ea2ff)]/[0.06] to-transparent" />
      )}
    </button>
  );
}
