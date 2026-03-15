import type { CSSProperties, ReactNode } from "react";

import { Kbd } from "@/components/module/kbd";
import { cn } from "@/lib/utils";

export interface FooterShortcut {
  /** Key(s) to display, e.g. ["Ctrl", "N"] or ["↵"] */
  keys: string[];
  /** Action label shown after the key(s) */
  label: string;
}

interface ModuleFooterProps {
  /** Left side: status text, count, etc. */
  leftSlot?: ReactNode;
  /** Keyboard shortcuts to show in the center/right area */
  shortcuts?: FooterShortcut[];
  /** Primary action buttons on the right */
  actions?: ReactNode;
  /** Anchored overlay rendered above the footer */
  overlay?: ReactNode;
  /** Show Cmd+K shortcut hint */
  showActionsShortcut?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ModuleFooter({
  leftSlot,
  shortcuts,
  actions,
  overlay,
  showActionsShortcut = true,
  className,
  style,
}: ModuleFooterProps) {
  const hasActionsShortcut =
    showActionsShortcut &&
    (shortcuts?.some(
      (shortcut) =>
        shortcut.label.toLowerCase() === "actions" &&
        shortcut.keys.join("+").toLowerCase().includes("k"),
    ) ??
      false);

  const resolvedShortcuts =
    showActionsShortcut && !hasActionsShortcut
      ? [...(shortcuts ?? []), { keys: ["⌘", "K"], label: "Actions" }]
      : shortcuts;

  return (
    <footer
      className={cn(
        "module-footer",
        "sc-glass-footer",
        "relative flex h-12 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4",
        className,
      )}
      style={style}
    >
      {/* Left: status / context */}
      <div className="module-footer-left flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
        {leftSlot}
      </div>

      {/* Right: shortcuts + actions */}
      <div className="module-footer-right flex items-center gap-3">
        {/* Keyboard shortcut hints */}
        {resolvedShortcuts && resolvedShortcuts.length > 0 && (
          <div className="module-footer-shortcuts hidden items-center gap-3 sm:flex">
            {resolvedShortcuts.map((shortcut) => (
              <span
                key={shortcut.keys.join("+")}
                className="flex items-center gap-1 text-[11px] text-muted-foreground/60"
              >
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
                <span className="ml-0.5">{shortcut.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {actions && (
          <>
            {resolvedShortcuts && resolvedShortcuts.length > 0 && (
              <span
                className="hidden h-4 w-px bg-[var(--ui-divider)] sm:block"
                aria-hidden="true"
              />
            )}
            <div className="module-footer-actions flex items-center gap-1.5">{actions}</div>
          </>
        )}
      </div>

      {overlay}
    </footer>
  );
}
