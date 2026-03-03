import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Semantic color variants that map to CSS variable pairs:
 * --icon-{variant}-bg / --icon-{variant}-fg
 *
 * All variants are defined in tokens.css (default & dark) and fully
 * overridden in themes.css (.sc-solid) and any user theme
 * (e.g. .theme-user-neo-brutalism). This means IconChip always
 * inherits the active theme's palette without any hardcoded colors.
 */
export type IconChipVariant =
  | "neutral"
  | "primary"
  | "orange"
  | "cyan"
  | "purple"
  | "red"
  | "green";

export type IconChipSize = "xs" | "sm" | "md" | "lg";

interface IconChipProps {
  variant?: IconChipVariant;
  size?: IconChipSize;
  className?: string;
  children: ReactNode;
}

const sizeClasses: Record<IconChipSize, string> = {
  xs: "size-6 rounded-md p-1",
  sm: "size-7 rounded-lg p-1.5",
  md: "size-8 rounded-lg p-1.5",
  lg: "size-9 rounded-xl p-2",
};

const variantStyles: Record<IconChipVariant, string> = {
  neutral: "bg-[var(--icon-neutral-bg)] text-[var(--icon-neutral-fg)]",
  primary: "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
  orange: "bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)]",
  cyan: "bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-fg)]",
  purple: "bg-[var(--icon-purple-bg)] text-[var(--icon-purple-fg)]",
  red: "bg-[var(--icon-red-bg)] text-[var(--icon-red-fg)]",
  green: "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]",
};

/**
 * A square icon container that uses theme-aware CSS variable color pairs.
 * Replaces hardcoded gradient backgrounds like `bg-gradient-to-br from-amber-500/25`.
 *
 * @example
 * // Before:
 * <div className="size-9 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/25 p-2">
 *   <ListTodo className="size-full text-amber-400" />
 * </div>
 *
 * // After:
 * <IconChip variant="orange" size="lg">
 *   <ListTodo />
 * </IconChip>
 */
export function IconChip({ variant = "neutral", size = "md", className, children }: IconChipProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        "[&_svg]:size-full [&_svg]:pointer-events-none",
        sizeClasses[size],
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
