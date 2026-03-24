import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LauncherTakeoverSurfaceProps {
  children: ReactNode;
  className?: string;
  /** When true, plays the exit animation (top-up fade-out). */
  exiting?: boolean;
}

export function LauncherTakeoverSurface({
  children,
  className,
  exiting,
}: LauncherTakeoverSurfaceProps) {
  return (
    <div
      className={cn(
        "beam-window-overlay absolute inset-0 z-50",
        exiting ? "takeover-exit" : "takeover-enter",
        className,
      )}
    >
      {children}
    </div>
  );
}
