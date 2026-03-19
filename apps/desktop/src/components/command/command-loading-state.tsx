import { Loader2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandLoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Loading message */
  label?: ReactNode;
  /** Show spinning loader */
  withSpinner?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Fill available height */
  fullHeight?: boolean;
}

const sizeConfig = {
  sm: { icon: "size-3.5", text: "text-launcher-xs", gap: "gap-1.5", minH: "min-h-[80px]" },
  md: { icon: "size-4", text: "text-launcher-sm", gap: "gap-2", minH: "min-h-[120px]" },
  lg: { icon: "size-5", text: "text-launcher-2xl", gap: "gap-2.5", minH: "min-h-[160px]" },
};

export function CommandLoadingState({
  label = "Loading...",
  withSpinner = true,
  size = "md",
  fullHeight = true,
  className,
  ...props
}: CommandLoadingStateProps) {
  const { icon, text, gap, minH } = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground",
        text,
        gap,
        fullHeight && `h-full ${minH}`,
        className,
      )}
      {...props}
    >
      {withSpinner && <Loader2 className={cn(icon, "animate-spin")} />}
      {label && <span>{label}</span>}
    </div>
  );
}

interface CommandInlineLoadingProps extends HTMLAttributes<HTMLSpanElement> {
  label?: ReactNode;
  iconClassName?: string;
}

export function CommandInlineLoading({
  label = "Loading",
  className,
  iconClassName,
  ...props
}: CommandInlineLoadingProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-launcher-2xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      <Loader2 className={cn("size-3.5 animate-spin", iconClassName)} />
      <span>{label}</span>
    </span>
  );
}

/** Pulsing dot loading indicator - minimal style */
export function CommandPulsingLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}
