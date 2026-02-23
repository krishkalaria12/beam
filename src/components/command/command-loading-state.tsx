import { Loader2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandLoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  withSpinner?: boolean;
}

export function CommandLoadingState({
  label = "Loading...",
  withSpinner = false,
  className,
  ...props
}: CommandLoadingStateProps) {
  return (
    <div
      className={cn("flex h-full items-center justify-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {withSpinner ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      <p>{label}</p>
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
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] text-muted-foreground", className)} {...props}>
      <Loader2 className={cn("size-3.5 animate-spin", iconClassName)} />
      <span>{label}</span>
    </span>
  );
}
