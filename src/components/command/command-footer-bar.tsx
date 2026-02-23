import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandFooterBarProps {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
  leftSlotClassName?: string;
  rightSlotClassName?: string;
}

export function CommandFooterBar({
  leftSlot,
  rightSlot,
  className,
  leftSlotClassName,
  rightSlotClassName,
}: CommandFooterBarProps) {
  return (
    <div
      className={cn(
        "sc-glass-footer flex h-[42px] shrink-0 items-center justify-between px-4 py-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-xs font-normal text-muted-foreground",
          leftSlotClassName,
        )}
      >
        {leftSlot}
      </div>
      <div className={cn("ml-3 flex items-center gap-3", rightSlotClassName)}>{rightSlot}</div>
    </div>
  );
}
