import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListItemProps {
  /** Controlled selected state */
  selected?: boolean;
  /** Click handler */
  onSelect?: () => void;
  /** Left-side slot — typically an IconChip */
  leftSlot?: ReactNode;
  /** Right-side slot — count badge, toggle, chevron, etc. */
  rightSlot?: ReactNode;
  /** Whether to show a left accent bar when selected (default: true) */
  showAccentBar?: boolean;
  /** Disable the item */
  disabled?: boolean;
  /** Extra class names on the root button */
  className?: string;
  children: ReactNode;
}

/**
 * A theme-aware, selectable list item for module list panels.
 *
 * - Selected state uses `--launcher-card-selected-bg` / `--launcher-card-selected-border`
 * - Hover state uses `--launcher-card-hover-bg`
 * - Left accent bar uses `--ring` when selected
 * - All colours respond to the active theme (default/solid/glassy/custom)
 *
 * @example
 * // Before (snippet-list.tsx):
 * <button
 *   className={cn(
 *     "group relative mb-1.5 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
 *     isSelected
 *       ? "bg-[var(--launcher-chip-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
 *       : "hover:bg-[var(--launcher-card-hover-bg)]",
 *   )}
 * >
 *   {children}
 * </button>
 *
 * // After:
 * <ListItem selected={isSelected} onSelect={() => onSelectSnippet(snippet.id)} leftSlot={<IconChip ...>}>
 *   <ListItem.Title>{snippet.name}</ListItem.Title>
 *   <ListItem.Description>{snippet.trigger}</ListItem.Description>
 * </ListItem>
 */
export function ListItem({
  selected = false,
  onSelect,
  leftSlot,
  rightSlot,
  showAccentBar = true,
  disabled = false,
  className,
  children,
}: ListItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl p-3 text-left",
        "transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]",
        className,
      )}
    >
      {/* Left accent bar */}
      {showAccentBar && (
        <div
          className={cn(
            "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all duration-150",
            selected ? "bg-[var(--ring)]" : "bg-transparent",
          )}
          aria-hidden="true"
        />
      )}

      {/* Left slot */}
      {leftSlot && <div className="shrink-0">{leftSlot}</div>}

      {/* Main content */}
      <div className="min-w-0 flex-1">{children}</div>

      {/* Right slot */}
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compound sub-components
// ---------------------------------------------------------------------------

interface TitleProps {
  children: ReactNode;
  className?: string;
}

function Title({ children, className }: TitleProps) {
  return (
    <p
      className={cn(
        "truncate text-[13px] font-medium tracking-[-0.01em] text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface DescriptionProps {
  children: ReactNode;
  className?: string;
}

function Description({ children, className }: DescriptionProps) {
  return (
    <p className={cn("truncate text-[11px] text-muted-foreground", className)}>{children}</p>
  );
}

ListItem.Title = Title;
ListItem.Description = Description;
