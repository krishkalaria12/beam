import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";
import beamLogo from "@/assets/beam-logo.png";

type InputPrimitiveProps = React.ComponentProps<typeof InputPrimitive>;

interface InputProps extends Omit<InputPrimitiveProps, "children"> {
  /** Show Beam logo on the left */
  showLogo?: boolean;
  /** Minimal style - no background, no borders, no focus ring */
  minimal?: boolean;
  /** Left icon/element (ignored if showLogo is true) */
  leftIcon?: React.ReactNode;
  /** Right icon/element */
  rightIcon?: React.ReactNode;
}

function Input({
  className,
  type,
  showLogo = false,
  minimal = false,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  const hasLeftContent = showLogo || leftIcon;
  const hasRightContent = rightIcon;

  const inputElement = (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "text-launcher-xs h-8 w-full min-w-0 rounded-none caret-[var(--ring)] outline-none transition-colors",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[length:var(--beam-text-xs)] file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        minimal
          ? "border-0 bg-transparent focus-visible:ring-0 focus-visible:border-transparent"
          : [
              "border border-input bg-transparent px-2.5 py-1",
              "dark:bg-input/30",
              "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
              "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20",
              "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
              "disabled:bg-input/50 dark:disabled:bg-input/80",
            ],
        hasLeftContent && "pl-0",
        hasRightContent && "pr-0",
        className,
      )}
      {...props}
    />
  );

  // If no decorations, return plain input
  if (!hasLeftContent && !hasRightContent) {
    return inputElement;
  }

  // Wrap with container for icons/logo
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        !minimal && [
          "border border-input rounded-none px-2.5",
          "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
        ],
      )}
    >
      {showLogo && <img src={beamLogo} alt="Beam" className="size-5 shrink-0 object-contain" />}
      {!showLogo && leftIcon && (
        <span className="shrink-0 text-muted-foreground/60">{leftIcon}</span>
      )}
      {inputElement}
      {rightIcon && <span className="shrink-0 text-muted-foreground/60">{rightIcon}</span>}
    </div>
  );
}

export { Input };
export type { InputProps };
