import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandFooterBarProps {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}

export function CommandFooterBar({
  leftSlot,
  rightSlot,
  className,
}: CommandFooterBarProps) {
  return (
    <div
      className={cn(
        "flex h-8 items-center justify-between border-t border-border/40 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60",
        className,
      )}
    >
      <div className="flex items-center gap-2">{leftSlot}</div>
      <div className="flex items-center gap-3">{rightSlot}</div>
    </div>
  );
}
