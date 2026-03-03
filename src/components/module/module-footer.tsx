import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Kbd } from "@/components/module/kbd";

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
  className?: string;
}

/**
 * Standardised module footer with left status slot, keyboard shortcut hints,
 * and right action buttons.
 *
 * Uses `--footer-border`, `--kbd-bg`, and `text-muted-foreground` so it
 * responds to every theme the same way the launcher footer does.
 *
 * @example
 * // Before (snippets-view.tsx):
 * <footer className="snippets-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4">
 *   <div className="flex items-center gap-2 text-[12px] text-foreground/40">
 *     <CircleDot className="size-3.5" />
 *     <span>{filteredSnippets.length} visible</span>
 *   </div>
 *   <div className="flex items-center gap-2">
 *     <span><kbd ...>Ctrl+N</kbd> New</span>
 *     ...
 *   </div>
 * </footer>
 *
 * // After:
 * <ModuleFooter
 *   leftSlot={<span>{filteredSnippets.length} visible</span>}
 *   shortcuts={[
 *     { keys: ["Ctrl", "N"], label: "New" },
 *     { keys: ["Ctrl", "E"], label: "Edit" },
 *   ]}
 *   actions={<Button size="sm">New</Button>}
 * />
 */
export function ModuleFooter({ leftSlot, shortcuts, actions, className }: ModuleFooterProps) {
  return (
    <footer
      className={cn(
        "flex h-12 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4",
        className,
      )}
    >
      {/* Left: status / context */}
      <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
        {leftSlot}
      </div>

      {/* Right: shortcuts + actions */}
      <div className="flex items-center gap-3">
        {/* Keyboard shortcut hints */}
        {shortcuts && shortcuts.length > 0 && (
          <div className="hidden items-center gap-3 sm:flex">
            {shortcuts.map((shortcut) => (
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
            {shortcuts && shortcuts.length > 0 && (
              <span
                className="hidden h-4 w-px bg-[var(--ui-divider)] sm:block"
                aria-hidden="true"
              />
            )}
            <div className="flex items-center gap-1.5">{actions}</div>
          </>
        )}
      </div>
    </footer>
  );
}
