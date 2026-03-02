import { ArrowLeft, X } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandPanelHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Show back button */
  showBack?: boolean;
  onBack?: () => void;
  /** Show close button */
  showClose?: boolean;
  onClose?: () => void;
  /** Title content */
  title?: ReactNode;
  /** Subtitle/breadcrumb */
  subtitle?: ReactNode;
  /** Right-side actions */
  actions?: ReactNode;
  /** Search input mode - adjusts styling for compact look */
  isSearchHeader?: boolean;
}

export function CommandPanelHeader({
  showBack,
  onBack,
  showClose,
  onClose,
  title,
  subtitle,
  actions,
  isSearchHeader,
  className,
  children,
  ...props
}: CommandPanelHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-10 flex shrink-0 items-center gap-3",
        "border-b border-[var(--ui-divider)]",
        isSearchHeader ? "px-4 py-3" : "px-5 py-3.5",
        className,
      )}
      {...props}
    >
      {/* Back Button */}
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className={cn("btn-icon -ml-1", "text-muted-foreground/65 hover:text-foreground")}
        >
          <ArrowLeft className="size-4" />
        </button>
      )}

      {/* Title Block */}
      {(title || subtitle) && (
        <div className="min-w-0 flex-1">
          {title && <p className="truncate text-sm font-medium text-foreground">{title}</p>}
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {/* Custom Children (e.g., search input) */}
      {children}

      {/* Right Actions */}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}

      {/* Close Button */}
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn("btn-icon", "text-muted-foreground/50 hover:text-foreground")}
        >
          <X className="size-4" />
        </button>
      )}
    </header>
  );
}

interface CommandPanelBackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string;
}

export function CommandPanelBackButton({
  className,
  iconClassName,
  type = "button",
  ...props
}: CommandPanelBackButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "btn-icon -ml-1",
        "text-muted-foreground/65 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
        className,
      )}
      {...props}
    >
      <ArrowLeft className={cn("size-4", iconClassName)} />
    </button>
  );
}

interface CommandPanelTitleBlockProps {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function CommandPanelTitleBlock({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: CommandPanelTitleBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("truncate text-sm font-medium text-foreground", titleClassName)}>{title}</p>
      {subtitle && (
        <p className={cn("truncate text-xs text-muted-foreground", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Close button component for headers */
export function CommandPanelCloseButton({
  className,
  iconClassName,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { iconClassName?: string }) {
  return (
    <button
      type={type}
      className={cn("btn-icon", "text-muted-foreground/50 hover:text-foreground", className)}
      {...props}
    >
      <X className={cn("size-4", iconClassName)} />
    </button>
  );
}
