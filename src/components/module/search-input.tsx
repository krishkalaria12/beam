import * as React from "react";

import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  /** Controlled value */
  value: string;
  /** Change handler receives the string directly, not a SyntheticEvent */
  onChange: (value: string) => void;
  /** Icon to show on the left side (e.g. <Search />) */
  leftIcon?: React.ReactNode;
  /** Icon/button to show on the right side (e.g. a clear button) */
  rightSlot?: React.ReactNode;
  /** Outer container className */
  containerClassName?: string;
}

/**
 * A theme-aware search input that uses CSS variables for all color states.
 * Replaces ad-hoc raw `<input>` elements with hardcoded Tailwind color classes.
 *
 * All background, border, text, placeholder, ring, and focus colors are driven
 * by CSS variables, so they respond correctly to any user-defined theme.
 *
 * @example
 * // Before:
 * <input
 *   className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-10 pr-4
 *              text-[14px] font-medium text-foreground/90 outline-none ring-1
 *              ring-[var(--launcher-card-border)] focus:ring-[var(--ring)]"
 *   placeholder="Search clipboard history..."
 * />
 *
 * // After:
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   leftIcon={<Search />}
 *   placeholder="Search clipboard history..."
 * />
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChange, leftIcon, rightSlot, className, containerClassName, ...props },
    ref,
  ) {
    return (
      <div
        className={cn(
          "relative flex items-center",
          "h-10 w-full rounded-xl",
          "bg-[var(--launcher-card-hover-bg)]",
          "ring-1 ring-[var(--launcher-card-border)]",
          "transition-all duration-200",
          "focus-within:ring-[var(--ring)] focus-within:bg-[var(--launcher-card-hover-bg)]",
          containerClassName,
        )}
      >
        {/* Left icon */}
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground/50 [&_svg]:size-4">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-full w-full bg-transparent",
            "text-[14px] font-medium tracking-[-0.01em] text-foreground",
            "placeholder:text-muted-foreground/40 placeholder:font-normal",
            "outline-none border-none",
            leftIcon ? "pl-9" : "pl-3.5",
            rightSlot ? "pr-9" : "pr-3.5",
            className,
          )}
          {...props}
        />

        {/* Right slot */}
        {rightSlot && (
          <div className="absolute right-2 flex items-center">{rightSlot}</div>
        )}
      </div>
    );
  },
);
