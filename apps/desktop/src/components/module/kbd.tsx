import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-4.5 px-1.25",
        "rounded bg-(--kbd-bg) border border-(--launcher-card-border)",
        "font-mono text-[length:calc(var(--beam-font-size-base)*0.6923)] font-medium text-muted-foreground",
        "leading-none select-none",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

interface KbdShortcutProps {
  keys: string[];
  label?: string;
  className?: string;
}

export function KbdShortcut({ keys, label, className }: KbdShortcutProps) {
  return (
    <span
      className={cn("flex items-center gap-1 text-launcher-xs text-muted-foreground", className)}
    >
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
      {label && <span className="ml-0.5">{label}</span>}
    </span>
  );
}
