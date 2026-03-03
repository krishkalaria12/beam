import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/**
 * A keyboard key badge that uses --kbd-bg from the active theme.
 * Replaces ad-hoc `<kbd>` with inline `bg-[var(--launcher-card-hover-bg)]` classes.
 *
 * @example
 * // Before:
 * <kbd className="rounded bg-[var(--launcher-card-hover-bg)] px-1.5 py-0.5 font-mono text-[10px]">
 *   Enter
 * </kbd>
 *
 * // After:
 * <Kbd>Enter</Kbd>
 */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-5.5 h-5 px-1.5",
        "rounded bg-(--kbd-bg) border border-(--launcher-card-border)",
        "font-mono text-[10px] font-medium text-muted-foreground",
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

/**
 * Renders a keyboard shortcut with one or more keys and an optional label.
 *
 * @example
 * <KbdShortcut keys={["Ctrl", "N"]} label="New" />
 */
export function KbdShortcut({ keys, label, className }: KbdShortcutProps) {
  return (
    <span className={cn("flex items-center gap-1 text-[11px] text-muted-foreground", className)}>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
      {label && <span className="ml-0.5">{label}</span>}
    </span>
  );
}
