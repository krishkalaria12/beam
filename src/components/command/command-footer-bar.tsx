import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Kbd } from "@/components/module/kbd";
import { Button } from "@/components/ui/button";

/** Individual footer action configuration */
export interface FooterAction {
  label: string;
  shortcut?: string[];
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

interface CommandFooterBarProps {
  /** Left slot content (typically app name or context) */
  leftSlot?: ReactNode;
  /** Primary action (bold text, shown first on right) */
  primaryAction?: FooterAction;
  /** Secondary actions (normal weight, shown after primary) */
  secondaryActions?: FooterAction[];
  /** Actions button (opens action panel, shown last with divider) */
  actionsButton?: FooterAction;
  /** Legacy: right slot for custom content */
  rightSlot?: ReactNode;
  className?: string;
  leftSlotClassName?: string;
  rightSlotClassName?: string;
}

const KEY_CLASS = cn(
  "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded",
  "bg-[var(--kbd-bg)] text-[11px] text-muted-foreground font-medium font-mono",
);

function ActionButton({
  action,
  isPrimary = false,
}: {
  action: FooterAction;
  isPrimary?: boolean;
}) {
  const shortcuts = action.shortcut || [];

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        if (!action.disabled && action.onClick) {
          void Promise.resolve(action.onClick());
        }
      }}
      disabled={action.disabled}
      className={cn(
        "h-auto px-0 py-0 transition-colors",
        "flex items-center gap-1.5",
        isPrimary
          ? "text-foreground hover:text-muted-foreground"
          : "text-muted-foreground hover:text-muted-foreground",
        action.disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn("text-xs truncate max-w-[180px]", isPrimary ? "font-medium" : "font-normal")}
      >
        {action.label}
      </span>
      {shortcuts.map((key) => (
        <Kbd key={`${action.label}-${key}`} className={KEY_CLASS}>
          {key}
        </Kbd>
      ))}
    </Button>
  );
}

export function CommandFooterBar({
  leftSlot,
  primaryAction,
  secondaryActions,
  actionsButton,
  rightSlot,
  className,
  leftSlotClassName,
  rightSlotClassName,
}: CommandFooterBarProps) {
  const hasActions = primaryAction || secondaryActions?.length || actionsButton;
  const showDivider = (primaryAction || secondaryActions?.length) && actionsButton;

  return (
    <div
      className={cn(
        "sc-glass-footer flex h-[42px] shrink-0 items-center justify-between px-4 py-2.5",
        className,
      )}
    >
      {/* Left slot: app name or context */}
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-xs font-normal text-muted-foreground",
          leftSlotClassName,
        )}
      >
        {leftSlot}
      </div>

      {/* Right slot: actions or legacy custom content */}
      <div className={cn("ml-3 flex items-center gap-3", rightSlotClassName)}>
        {hasActions ? (
          <>
            {/* Primary action (bold) */}
            {primaryAction && <ActionButton action={primaryAction} isPrimary />}

            {/* Secondary actions */}
            {secondaryActions?.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}

            {/* Divider before actions button */}
            {showDivider && <span className="h-5 w-px bg-[var(--ui-divider)] mx-0.5" />}

            {/* Actions button */}
            {actionsButton && <ActionButton action={actionsButton} />}
          </>
        ) : (
          rightSlot
        )}
      </div>
    </div>
  );
}
