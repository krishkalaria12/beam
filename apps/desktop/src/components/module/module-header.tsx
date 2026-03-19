import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  /** Back button handler */
  onBack: () => void;
  /** Icon element — use IconChip or any node */
  icon?: ReactNode;
  /** Primary title text */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Optional right-side badge (e.g. count chip) */
  badge?: ReactNode;
  /** Optional extra right-side content (e.g. loading spinner) */
  rightSlot?: ReactNode;
  /** Override header height (default h-14) */
  className?: string;
}

export function ModuleHeader({
  onBack,
  icon,
  title,
  subtitle,
  badge,
  rightSlot,
  className,
}: ModuleHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4",
        className,
      )}
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onBack}
        aria-label="Back"
        className={cn(
          "size-9 rounded-lg",
          "bg-[var(--launcher-card-bg)] text-muted-foreground",
          "hover:bg-[var(--launcher-chip-bg)] hover:text-foreground",
          "transition-all duration-200",
        )}
      >
        <ArrowLeft className="size-4" />
      </Button>

      {/* Icon */}
      {icon && <div className="shrink-0">{icon}</div>}

      {/* Title block */}
      <div className="min-w-0 flex-1">
        <h1 className="text-launcher-lg truncate font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-launcher-sm truncate tracking-[-0.01em] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: badge + extra slot */}
      {(badge || rightSlot) && (
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {rightSlot}
        </div>
      )}
    </header>
  );
}

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full bg-[var(--launcher-chip-bg)] border border-[var(--launcher-chip-border)]",
        "text-launcher-xs px-2.5 py-1 font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

ModuleHeader.Badge = Badge;
