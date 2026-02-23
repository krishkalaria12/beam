import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

interface CommandStatusChipProps {
  label: ReactNode;
  tone?: StatusTone;
  className?: string;
  pulse?: boolean;
}

const STATUS_TONE_CLASSNAMES: Record<StatusTone, string> = {
  neutral: "border-border/60 bg-muted/20 text-muted-foreground/75",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-500",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function CommandStatusChip({
  label,
  tone = "neutral",
  className,
  pulse = false,
}: CommandStatusChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        STATUS_TONE_CLASSNAMES[tone],
        className,
      )}
    >
      {pulse ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-emerald-500 animate-pulse",
            tone === "warning" && "bg-amber-500 animate-pulse",
            tone === "info" && "bg-sky-500 animate-pulse",
            tone === "error" && "bg-destructive animate-pulse",
            tone === "neutral" && "bg-muted-foreground/50",
          )}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
    </div>
  );
}
