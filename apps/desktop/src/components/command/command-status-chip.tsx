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
  info: "border-[var(--icon-primary-bg)] bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
  success: "border-[var(--icon-green-bg)] bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]",
  warning: "border-[var(--icon-orange-bg)] bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)]",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-launcher-2xs uppercase tracking-[0.14em]",
        STATUS_TONE_CLASSNAMES[tone],
        className,
      )}
    >
      {pulse ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-[var(--icon-green-bg)] animate-pulse",
            tone === "warning" && "bg-[var(--icon-orange-bg)] animate-pulse",
            tone === "info" && "bg-[var(--icon-primary-bg)] animate-pulse",
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
