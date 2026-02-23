import { ArrowLeft } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CommandPanelHeaderProps = HTMLAttributes<HTMLElement>;

export function CommandPanelHeader({ className, ...props }: CommandPanelHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-10 flex shrink-0 items-center gap-3 border-b border-[var(--ui-divider)] px-5 py-3.5",
        className,
      )}
      {...props}
    />
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
        "inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground/65 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
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
      {subtitle ? (
        <p className={cn("truncate text-xs text-muted-foreground", subtitleClassName)}>{subtitle}</p>
      ) : null}
    </div>
  );
}
