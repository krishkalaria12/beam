import { useState, type ReactNode } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

interface LauncherTakeoverSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function LauncherTakeoverSurface({ children, className }: LauncherTakeoverSurfaceProps) {
  const [isInteractive, setIsInteractive] = useState(false);

  useMountEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsInteractive(true);
    }, 160);

    return () => {
      window.clearTimeout(timerId);
    };
  });

  return (
    <div
      className={cn(
        "absolute inset-0 z-50",
        "animate-in fade-in zoom-in-[0.985] duration-200",
        isInteractive ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
