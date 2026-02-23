import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LauncherTakeoverSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function LauncherTakeoverSurface({
  children,
  className,
}: LauncherTakeoverSurfaceProps) {
  return (
    <div className={cn("absolute inset-0 z-50 bg-background", className)}>
      {children}
    </div>
  );
}
