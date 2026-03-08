import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
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

export function ListItem({
  selected = false,
  onSelect,
  leftSlot,
  rightSlot,
  showAccentBar = true,
  disabled = false,
  className,
  children,
  ...props
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
      {...props}
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
  return <p className={cn("truncate text-[11px] text-muted-foreground", className)}>{children}</p>;
}

ListItem.Title = Title;
ListItem.Description = Description;

