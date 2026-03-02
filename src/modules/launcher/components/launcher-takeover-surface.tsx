import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LauncherTakeoverSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function LauncherTakeoverSurface({ children, className }: LauncherTakeoverSurfaceProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50",
        "animate-in fade-in zoom-in-[0.985] duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
