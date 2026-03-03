import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

/**
 * Standardised module header with back button, icon, title/subtitle, and optional badge.
 *
 * Uses only CSS variables so it responds to any active theme.
 *
 * @example
 * // Before (snippets-view.tsx):
 * <header className="snippets-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
 *   <button ...> <ArrowLeft /> </button>
 *   <div className="size-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/25 p-1.5">
 *     <NotebookTabs className="size-full text-amber-400" />
 *   </div>
 *   <h1>Snippets</h1>
 *   ...
 * </header>
 *
 * // After:
 * <ModuleHeader
 *   onBack={onBack}
 *   icon={<IconChip variant="orange" size="md"><NotebookTabs /></IconChip>}
 *   title="Snippets"
 *   subtitle="Create, preview, and paste text snippets"
 *   badge={<ModuleHeader.Badge>{snippets.length} snippets</ModuleHeader.Badge>}
 * />
 */
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
        <h1 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[12px] tracking-[-0.01em] text-muted-foreground">
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

// ---------------------------------------------------------------------------
// Compound sub-components
// ---------------------------------------------------------------------------

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

/**
 * Small count/label chip shown in the header right area.
 */
function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full bg-[var(--launcher-chip-bg)] border border-[var(--launcher-chip-border)]",
        "px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

ModuleHeader.Badge = Badge;
