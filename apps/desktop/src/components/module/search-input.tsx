import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
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

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChange, leftIcon, rightSlot, className, containerClassName, ...props },
    ref,
  ) {
    return (
      <div
        className={cn(
          "module-search-input",
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
          <div className="module-search-input-left pointer-events-none absolute left-3 flex items-center text-muted-foreground/50 [&_svg]:size-4">
            {leftIcon}
          </div>
        )}

        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "module-search-input-field",
            "h-full w-full bg-transparent dark:bg-transparent",
            "text-[14px] font-medium tracking-[-0.01em] text-foreground",
            "placeholder:text-muted-foreground/40 placeholder:font-normal",
            "outline-none border-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-transparent",
            leftIcon ? "pl-9" : "pl-3.5",
            rightSlot ? "pr-9" : "pr-3.5",
            className,
          )}
          {...props}
        />

        {/* Right slot */}
        {rightSlot && <div className="module-search-input-right absolute right-2 flex items-center">{rightSlot}</div>}
      </div>
    );
  },
);
